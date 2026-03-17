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

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.parosproxy.paros.Constant;
import org.parosproxy.paros.control.Control;
import org.parosproxy.paros.extension.ExtensionAdaptor;
import org.parosproxy.paros.extension.ExtensionHook;
import org.zaproxy.addon.network.ExtensionNetwork;

/**
 * Extension that provides a modern web-based UI for ZAP. The Web UI is served via an HTTP server
 * created through ZAP's ExtensionNetwork and communicates with ZAP via its existing API.
 */
public class ExtensionWebUi extends ExtensionAdaptor {

    public static final String NAME = "ExtensionWebUi";

    protected static final String PREFIX = "webui";

    private static final Logger LOGGER = LogManager.getLogger(ExtensionWebUi.class);

    private ExtensionNetwork extensionNetwork;
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

        // Obtain ExtensionNetwork for creating the HTTP server
        this.extensionNetwork =
                Control.getSingleton().getExtensionLoader().getExtension(ExtensionNetwork.class);
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
            if (extensionNetwork == null) {
                LOGGER.warn("ExtensionNetwork not available. Web UI will not be available.");
                return;
            }

            webUiServer = new WebUiServer(extensionNetwork, param.getPort());
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

    @Override
    public boolean canUnload() {
        return true;
    }

    @Override
    public void unload() {
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
}
