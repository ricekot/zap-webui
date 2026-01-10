/*
 * Zed Attack Proxy (ZAP) and its related class files.
 *
 * ZAP is an HTTP/HTTPS proxy for assessing web application security.
 *
 * Copyright 2026 The ZAP Development Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.zaproxy.addon.webui;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.api.Request;
import org.eclipse.jetty.proxy.AsyncProxyServlet;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.DefaultServlet;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.websocket.server.JettyWebSocketServlet;
import org.eclipse.jetty.websocket.server.JettyWebSocketServletFactory;
import org.eclipse.jetty.websocket.server.config.JettyWebSocketServletContainerInitializer;
import org.parosproxy.paros.network.HttpHeader;

/**
 * Embedded HTTP server for serving the Web UI. Provides:
 *
 * <ul>
 *   <li>Static file serving for the React SPA
 *   <li>SPA fallback routing (non-asset paths return index.html)
 *   <li>Reverse proxy for ZAP API requests (/api/*)
 *   <li>WebSocket endpoint for real-time events (/api/events)
 *   <li>API key injection for proxied requests
 * </ul>
 */
public class WebUiServer {

    private static final Logger LOGGER = LogManager.getLogger(WebUiServer.class);

    /** Default port for the Web UI server. */
    public static final int DEFAULT_PORT = 9999;

    /** Path prefix for API proxy requests. */
    private static final String API_PATH_PREFIX = "/api";

    /** WebSocket endpoint path for real-time events. */
    private static final String EVENTS_WEBSOCKET_PATH = "/api/events";

    private final Server server;
    private final Path webRoot;
    private final int zapApiPort;
    private final String zapApiKey;
    private int port;
    private HttpClient httpClient;

    /**
     * Creates a new Web UI server.
     *
     * @param webRoot Path to the directory containing the built web UI files
     * @param port Port to listen on
     * @param zapApiPort Port of the ZAP API server
     * @param zapApiKey API key for authenticating with ZAP API (can be null if API key is disabled)
     */
    public WebUiServer(Path webRoot, int port, int zapApiPort, String zapApiKey) {
        this.webRoot = webRoot;
        this.port = port;
        this.zapApiPort = zapApiPort;
        this.zapApiKey = zapApiKey;
        this.server = new Server(port);
    }

    /**
     * Starts the Web UI server.
     *
     * @throws Exception if the server fails to start
     */
    public void start() throws Exception {
        if (!Files.exists(webRoot)) {
            throw new IOException("Web UI directory does not exist: " + webRoot);
        }

        // Initialize HTTP client for proxy
        httpClient = new HttpClient();
        httpClient.start();

        // Create the servlet context
        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/");
        context.setResourceBase(webRoot.toString());

        // Initialize WebSocket support
        JettyWebSocketServletContainerInitializer.configure(
                context,
                (servletContext, wsContainer) -> {
                    wsContainer.setIdleTimeout(Duration.ofMinutes(10));
                });

        // Add WebSocket event endpoint servlet
        ServletHolder wsHolder =
                new ServletHolder("events-websocket", new EventsWebSocketServlet());
        context.addServlet(wsHolder, EVENTS_WEBSOCKET_PATH);

        // Add API proxy servlet for /api/* (except websocket)
        ServletHolder proxyHolder = new ServletHolder("api-proxy", new ZapApiProxyServlet());
        proxyHolder.setInitParameter("proxyTo", "http://localhost:" + zapApiPort);
        proxyHolder.setInitParameter("prefix", API_PATH_PREFIX);
        context.addServlet(proxyHolder, API_PATH_PREFIX + "/*");

        // Add SPA servlet for all other paths (serves index.html for non-asset routes)
        ServletHolder spaHolder = new ServletHolder("spa", new SpaServlet());
        spaHolder.setInitParameter("resourceBase", webRoot.toString());
        spaHolder.setInitParameter("dirAllowed", "false");
        spaHolder.setInitParameter("pathInfoOnly", "true");
        context.addServlet(spaHolder, "/*");

        server.setHandler(context);

        server.start();
        this.port = server.getURI().getPort();
        LOGGER.info("Web UI server started on port {}", this.port);
    }

    /**
     * Stops the Web UI server.
     *
     * @throws Exception if the server fails to stop
     */
    public void stop() throws Exception {
        // Close all WebSocket client sessions
        WebUiEventEndpoint.closeAllSessions();

        if (httpClient != null) {
            httpClient.stop();
        }
        if (server != null) {
            server.stop();
            LOGGER.info("Web UI server stopped");
        }
    }

    /**
     * Returns the port the server is listening on.
     *
     * @return the server port
     */
    public int getPort() {
        return port;
    }

    /**
     * Returns whether the server is running.
     *
     * @return true if the server is running
     */
    public boolean isRunning() {
        return server != null && server.isRunning();
    }

    /**
     * Returns the URL of the Web UI.
     *
     * @return the Web UI URL
     */
    public String getUrl() {
        return "http://localhost:" + port + "/";
    }

    /**
     * Servlet that serves the SPA with fallback routing. Static assets are served directly, while
     * all other paths return index.html for client-side routing.
     */
    private class SpaServlet extends DefaultServlet {

        private static final long serialVersionUID = 1L;
        private static final String INDEX_HTML = "/index.html";

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response)
                throws ServletException, IOException {

            String path = request.getPathInfo();
            if (path == null) {
                path = request.getServletPath();
            }

            // Check if this is a static asset request
            if (isStaticAsset(path)) {
                // Serve the static file
                super.doGet(request, response);
            } else {
                // SPA fallback: serve index.html for all non-asset routes
                request.getRequestDispatcher(INDEX_HTML).forward(request, response);
            }
        }

        /**
         * Determines if the path is for a static asset based on file extension.
         *
         * @param path the request path
         * @return true if this is a static asset request
         */
        private boolean isStaticAsset(String path) {
            if (path == null || path.isEmpty() || path.equals("/")) {
                return false;
            }

            // Check if file exists at the path
            String relativePath = path.startsWith("/") ? path.substring(1) : path;
            Path filePath = webRoot.resolve(relativePath);
            if (Files.exists(filePath) && !Files.isDirectory(filePath)) {
                return true;
            }

            // Also check common static asset extensions
            String lowerPath = path.toLowerCase();
            return lowerPath.endsWith(".js")
                    || lowerPath.endsWith(".css")
                    || lowerPath.endsWith(".html")
                    || lowerPath.endsWith(".htm")
                    || lowerPath.endsWith(".json")
                    || lowerPath.endsWith(".map")
                    || lowerPath.endsWith(".png")
                    || lowerPath.endsWith(".jpg")
                    || lowerPath.endsWith(".jpeg")
                    || lowerPath.endsWith(".gif")
                    || lowerPath.endsWith(".svg")
                    || lowerPath.endsWith(".ico")
                    || lowerPath.endsWith(".woff")
                    || lowerPath.endsWith(".woff2")
                    || lowerPath.endsWith(".ttf")
                    || lowerPath.endsWith(".eot")
                    || lowerPath.endsWith(".otf")
                    || lowerPath.endsWith(".webp")
                    || lowerPath.endsWith(".webm")
                    || lowerPath.endsWith(".mp4")
                    || lowerPath.endsWith(".mp3")
                    || lowerPath.endsWith(".wav")
                    || lowerPath.endsWith(".txt")
                    || lowerPath.endsWith(".xml")
                    || lowerPath.endsWith(".pdf");
        }
    }

    /** Proxy servlet that forwards API requests to the ZAP API server and injects the API key. */
    private class ZapApiProxyServlet extends AsyncProxyServlet.Transparent {

        private static final long serialVersionUID = 1L;

        @Override
        protected String rewriteTarget(HttpServletRequest request) {
            String path = request.getRequestURI();

            // Skip events WebSocket path - handled by separate servlet
            if (path.equals(EVENTS_WEBSOCKET_PATH)) {
                return null;
            }

            // Remove /api prefix and forward to ZAP API
            String apiPath = path.substring(API_PATH_PREFIX.length());

            StringBuilder uri = new StringBuilder("http://localhost:");
            uri.append(zapApiPort);
            uri.append(apiPath);

            String query = request.getQueryString();
            if (query != null) {
                uri.append("?").append(query);
            }

            return uri.toString();
        }

        @Override
        protected void addProxyHeaders(HttpServletRequest clientRequest, Request proxyRequest) {
            super.addProxyHeaders(clientRequest, proxyRequest);

            // Inject API key if configured
            if (zapApiKey != null && !zapApiKey.isEmpty()) {
                proxyRequest.headers(headers -> headers.add(HttpHeader.X_ZAP_API_KEY, zapApiKey));
            }
        }

        @Override
        protected HttpClient newHttpClient() {
            return httpClient;
        }

        @Override
        protected HttpClient createHttpClient() throws ServletException {
            return httpClient;
        }
    }

    /**
     * WebSocket servlet that provides a real-time event endpoint for the Web UI. This is a native
     * endpoint served by this add-on, not a proxy to ZAP's websocket add-on.
     */
    private static class EventsWebSocketServlet extends JettyWebSocketServlet {

        private static final long serialVersionUID = 1L;

        @Override
        protected void configure(JettyWebSocketServletFactory factory) {
            factory.setIdleTimeout(Duration.ofMinutes(10));
            factory.setCreator((req, resp) -> new WebUiEventEndpoint());
        }
    }
}
