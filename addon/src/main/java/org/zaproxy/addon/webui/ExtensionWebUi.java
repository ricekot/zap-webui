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

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.parosproxy.paros.Constant;
import org.parosproxy.paros.extension.ExtensionAdaptor;
import org.parosproxy.paros.extension.ExtensionHook;
import org.parosproxy.paros.model.Model;
import org.parosproxy.paros.model.SiteMapEventPublisher;
import org.parosproxy.paros.model.SiteNode;
import org.zaproxy.zap.ZAP;
import org.zaproxy.zap.eventBus.Event;
import org.zaproxy.zap.eventBus.EventConsumer;

/**
 * Extension that provides a modern web-based UI for ZAP. The Web UI is served via an embedded HTTP
 * server and communicates with ZAP via its existing API.
 */
public class ExtensionWebUi extends ExtensionAdaptor implements EventConsumer {

    public static final String NAME = "ExtensionWebUi";

    protected static final String PREFIX = "webui";

    /** Relative path within ZAP home to the web UI files. */
    private static final String WEBUI_DIR = "webui";

    private static final Logger LOGGER = LogManager.getLogger(ExtensionWebUi.class);

    private WebUiServer webUiServer;
    private WebUiParam param;

    public ExtensionWebUi() {
        super(NAME);
    }

    @Override
    public void hook(ExtensionHook extensionHook) {
        super.hook(extensionHook);

        // Register parameters
        this.param = new WebUiParam();
        extensionHook.addOptionsParamSet(this.param);

        // Subscribe to site map events via the global EventBus
        ZAP.getEventBus()
                .registerConsumer(
                        this,
                        SiteMapEventPublisher.getPublisher().getPublisherName(),
                        SiteMapEventPublisher.SITE_NODE_ADDED_EVENT);
    }

    @Override
    public void postInit() {
        super.postInit();

        // Start the Web UI server after ZAP is fully initialized
        if (param.isEnabled()) {
            startWebUiServer();
        }
    }

    /** Starts the Web UI server. */
    private void startWebUiServer() {
        try {
            Path webRoot = getWebUiPath();
            if (!Files.exists(webRoot)) {
                LOGGER.warn(
                        "Web UI directory not found at {}. Web UI will not be available.", webRoot);
                return;
            }

            int zapApiPort = getZapApiPort();
            String zapApiKey = getZapApiKey();

            webUiServer = new WebUiServer(webRoot, param.getPort(), zapApiPort, zapApiKey);
            webUiServer.start();

            LOGGER.info("Web UI available at {}", webUiServer.getUrl());
        } catch (Exception e) {
            LOGGER.error("Failed to start Web UI server", e);
        }
    }

    /** Stops the Web UI server. */
    private void stopWebUiServer() {
        if (webUiServer != null) {
            try {
                webUiServer.stop();
                webUiServer = null;
            } catch (Exception e) {
                LOGGER.error("Failed to stop Web UI server", e);
            }
        }
    }

    /**
     * Gets the path to the Web UI directory.
     *
     * @return the path to the Web UI files
     */
    private Path getWebUiPath() {
        return Paths.get(Constant.getZapHome(), WEBUI_DIR);
    }

    /**
     * Gets the ZAP API port.
     *
     * @return the API port
     */
    @SuppressWarnings("deprecation")
    private int getZapApiPort() {
        // The ZAP API runs on the same port as the proxy
        return Model.getSingleton().getOptionsParam().getProxyParam().getProxyPort();
    }

    /**
     * Gets the ZAP API key, or null if the API key is disabled.
     *
     * @return the API key or null
     */
    private String getZapApiKey() {
        var apiParam = Model.getSingleton().getOptionsParam().getApiParam();
        if (apiParam.isDisableKey()) {
            return null;
        }
        // Access the API key from config directly since getKey() is protected
        var config = Model.getSingleton().getOptionsParam().getConfig();
        return config.getString("api.key", null);
    }

    @Override
    public boolean canUnload() {
        return true;
    }

    @Override
    public void unload() {
        ZAP.getEventBus().unregisterConsumer(this);
        stopWebUiServer();
        super.unload();
    }

    @Override
    public void stop() {
        stopWebUiServer();
        super.stop();
    }

    @Override
    public String getDescription() {
        return Constant.messages.getString(PREFIX + ".desc");
    }

    /**
     * Returns whether the Web UI server is running.
     *
     * @return true if the server is running
     */
    public boolean isServerRunning() {
        return webUiServer != null && webUiServer.isRunning();
    }

    /**
     * Returns the URL of the Web UI.
     *
     * @return the Web UI URL, or null if the server is not running
     */
    public String getWebUiUrl() {
        return webUiServer != null ? webUiServer.getUrl() : null;
    }

    /**
     * Returns the Web UI parameters.
     *
     * @return the parameters
     */
    public WebUiParam getParam() {
        return param;
    }

    @Override
    public void eventReceived(Event event) {
        if (SiteMapEventPublisher.SITE_NODE_ADDED_EVENT.equals(event.getEventType())) {
            SiteNode siteNode = event.getTarget().getStartNode();
            if (siteNode != null) {
                // Don't include children for incremental updates - frontend will insert at correct
                // position
                WebUiEventEndpoint.broadcastEvent(
                        "sitenode.added", WebUiEventEndpoint.serializeSiteNode(siteNode, false));
            }
        }
    }
}
