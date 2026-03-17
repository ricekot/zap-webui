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

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Socket;
import java.util.Map;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.parosproxy.paros.network.HttpInputStream;
import org.parosproxy.paros.network.HttpMalformedHeaderException;
import org.parosproxy.paros.network.HttpMessage;
import org.parosproxy.paros.network.HttpOutputStream;
import org.parosproxy.paros.network.HttpRequestHeader;
import org.zaproxy.addon.network.ExtensionNetwork;
import org.zaproxy.addon.network.server.HttpMessageHandler;
import org.zaproxy.addon.network.server.HttpMessageHandlerContext;
import org.zaproxy.addon.network.server.Server;
import org.zaproxy.zap.extension.api.API;
import org.zaproxy.zap.network.HttpRequestBody;

/**
 * HTTP server for serving the Web UI. Uses ZAP's {@link ExtensionNetwork} to create a lightweight
 * server that:
 *
 * <ul>
 *   <li>Routes API requests ({@code /JSON/}, {@code /UI/}, {@code /OTHER/}, {@code /script.js}) to
 *       ZAP's API in-process
 *   <li>Serves static frontend files from the classpath {@code webui/} resource directory
 *   <li>Provides SPA fallback routing (non-file paths return {@code index.html})
 * </ul>
 */
public class WebUiServer {

    private static final Logger LOGGER = LogManager.getLogger(WebUiServer.class);

    /** Default port for the Web UI server. */
    public static final int DEFAULT_PORT = 9999;

    /** Classpath resource directory containing the built frontend files. */
    private static final String RESOURCE_PREFIX = "/webui/";

    /** Default page served for SPA fallback. */
    private static final String INDEX_HTML = "index.html";

    /** Content-type mappings for static file extensions. */
    private static final Map<String, String> CONTENT_TYPES =
            Map.ofEntries(
                    Map.entry(".html", "text/html"),
                    Map.entry(".css", "text/css"),
                    Map.entry(".js", "text/javascript"),
                    Map.entry(".json", "application/json"),
                    Map.entry(".svg", "image/svg+xml"),
                    Map.entry(".woff", "font/woff"),
                    Map.entry(".woff2", "font/woff2"),
                    Map.entry(".ttf", "font/ttf"),
                    Map.entry(".ico", "image/x-icon"),
                    Map.entry(".png", "image/png"),
                    Map.entry(".jpg", "image/jpeg"),
                    Map.entry(".gif", "image/gif"),
                    Map.entry(".map", "application/json"),
                    Map.entry(".txt", "text/plain"));

    private final ExtensionNetwork extensionNetwork;
    private final int port;
    private Server server;

    /**
     * Creates a new Web UI server.
     *
     * @param extensionNetwork the ExtensionNetwork instance for creating the HTTP server
     * @param port port to listen on
     */
    public WebUiServer(ExtensionNetwork extensionNetwork, int port) {
        this.extensionNetwork = extensionNetwork;
        this.port = port;
    }

    /**
     * Starts the Web UI server.
     *
     * @throws IOException if the server fails to start
     */
    public void start() throws IOException {
        server = extensionNetwork.createHttpServer(new WebUiHandler());
        server.start("localhost", port);
        LOGGER.info("Web UI server started on port {}", port);
    }

    /**
     * Stops the Web UI server.
     *
     * @throws IOException if the server fails to stop
     */
    public void stop() throws IOException {
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
        return server != null;
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
     * Determines if the request is for ZAP's API.
     *
     * @param msg the HTTP message
     * @return true if the path matches an API route
     */
    static boolean isApiRequest(HttpMessage msg) {
        String path = msg.getRequestHeader().getURI().getEscapedPath();
        return path.startsWith("/JSON/")
                || path.startsWith("/UI/")
                || path.startsWith("/OTHER/")
                || path.startsWith("/script.js");
    }

    /**
     * Forwards an API request to ZAP's API handler in-process.
     *
     * @param ctx the handler context
     * @param msg the HTTP message
     * @throws IOException if API handling fails
     */
    private static void handleApiRequest(HttpMessageHandlerContext ctx, HttpMessage msg)
            throws IOException {
        HttpRequestHeader requestHeader = new HttpRequestHeader(msg.getRequestHeader().toString());
        requestHeader.setSenderAddress(msg.getRequestHeader().getSenderAddress());
        HttpRequestBody reqBody = msg.getRequestBody();

        InputStream is = new ByteArrayInputStream(reqBody.getBytes());
        Socket socket =
                new Socket() {
                    @Override
                    public InputStream getInputStream() throws IOException {
                        return is;
                    }
                };
        HttpInputStream httpIn = new HttpInputStream(socket);
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        HttpOutputStream httpOut = new HttpOutputStream(os);

        HttpMessage apiResponse =
                API.getInstance()
                        .handleApiRequest(requestHeader, httpIn, httpOut, ctx.isRecursive());

        if (apiResponse != null) {
            if (apiResponse.getRequestHeader().isEmpty()) {
                ctx.close();
                return;
            }
            msg.setResponseHeader(apiResponse.getResponseHeader());
            msg.setResponseBody(apiResponse.getResponseBody());
            ctx.overridden();
        }
    }

    /**
     * Serves a static file from the classpath resource directory.
     *
     * @param msg the HTTP message to populate with the response
     * @param resourcePath the classpath resource path
     * @param contentType the content type for the response
     * @throws IOException if the resource cannot be read
     */
    private static void serveResource(HttpMessage msg, String resourcePath, String contentType)
            throws IOException {
        try (InputStream is = WebUiServer.class.getResourceAsStream(resourcePath)) {
            if (is == null) {
                setNotFoundResponse(msg);
                return;
            }
            byte[] body = is.readAllBytes();
            msg.setResponseBody(body);
            msg.setResponseHeader(buildResponseHeader("200 OK", contentType, body.length));
        }
    }

    /**
     * Sets a 404 Not Found response on the message.
     *
     * @param msg the HTTP message
     */
    private static void setNotFoundResponse(HttpMessage msg) {
        try {
            String body = "404 Not Found";
            msg.setResponseBody(body);
            msg.setResponseHeader(
                    buildResponseHeader("404 Not Found", "text/plain", body.length()));
        } catch (HttpMalformedHeaderException e) {
            LOGGER.error("Failed to set 404 response", e);
        }
    }

    /**
     * Builds an HTTP response header string.
     *
     * @param status the HTTP status (e.g. "200 OK")
     * @param contentType the content type
     * @param contentLength the content length
     * @return the formatted response header string
     * @throws HttpMalformedHeaderException if the header is malformed
     */
    static String buildResponseHeader(String status, String contentType, int contentLength)
            throws HttpMalformedHeaderException {
        StringBuilder sb = new StringBuilder(250);
        sb.append("HTTP/1.1 ").append(status).append("\r\n");
        sb.append("Pragma: no-cache\r\n");
        sb.append("Cache-Control: no-cache, no-store, must-revalidate\r\n");
        sb.append(
                "Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src 'self'; "
                        + "child-src 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self'\r\n");
        sb.append("X-Frame-Options: SAMEORIGIN\r\n");
        sb.append("X-Content-Type-Options: nosniff\r\n");
        sb.append("Content-Length: ").append(contentLength).append("\r\n");
        sb.append("Content-Type: ").append(contentType).append("\r\n");
        return sb.toString();
    }

    /**
     * Gets the content type for a file based on its extension.
     *
     * @param path the file path
     * @return the content type, or {@code null} if the extension is not recognized
     */
    static String getContentType(String path) {
        int dotIndex = path.lastIndexOf('.');
        if (dotIndex < 0) {
            return null;
        }
        String extension = path.substring(dotIndex).toLowerCase();
        return CONTENT_TYPES.get(extension);
    }

    /**
     * Handler that processes all incoming HTTP requests: API routing, static file serving, and SPA
     * fallback.
     */
    private static class WebUiHandler implements HttpMessageHandler {

        @Override
        public void handleMessage(HttpMessageHandlerContext ctx, HttpMessage msg) {
            ctx.overridden();

            try {
                String path = msg.getRequestHeader().getURI().getEscapedPath();

                // Route API requests to ZAP's API handler
                if (isApiRequest(msg)) {
                    handleApiRequest(ctx, msg);
                    return;
                }

                // Normalize path
                if (path == null || path.equals("/")) {
                    path = "/" + INDEX_HTML;
                }

                // Determine content type from file extension
                String contentType = getContentType(path);

                if (contentType != null) {
                    // Known file extension — serve static file
                    String resourcePath = RESOURCE_PREFIX + path.substring(1);
                    serveResource(msg, resourcePath, contentType);
                } else {
                    // No recognized extension — SPA fallback: serve index.html
                    serveResource(msg, RESOURCE_PREFIX + INDEX_HTML, "text/html");
                }
            } catch (Exception e) {
                LOGGER.error("Error handling request", e);
                setNotFoundResponse(msg);
            }
        }
    }
}
