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

import org.zaproxy.zap.common.VersionedAbstractParam;

/** Parameters for the Web UI add-on. Persists configuration options to ZAP's config file. */
public class WebUiParam extends VersionedAbstractParam {

    /**
     * The current version of the configurations. Used to keep track of configuration changes
     * between releases, in case changes/updates are needed.
     */
    private static final int CURRENT_CONFIG_VERSION = 1;

    private static final String PARAM_BASE_KEY = "webui";
    private static final String CONFIG_VERSION_KEY = PARAM_BASE_KEY + ".configVersion";

    private static final String PARAM_PORT = PARAM_BASE_KEY + ".port";
    private static final String PARAM_ENABLED = PARAM_BASE_KEY + ".enabled";

    /** Default port for the Web UI server. */
    public static final int DEFAULT_PORT = 9999;

    /** The port for the Web UI server. */
    private int port = DEFAULT_PORT;

    /** Whether the Web UI server is enabled. */
    private boolean enabled = true;

    @Override
    protected int getCurrentVersion() {
        return CURRENT_CONFIG_VERSION;
    }

    @Override
    protected String getConfigVersionKey() {
        return CONFIG_VERSION_KEY;
    }

    @Override
    protected void parseImpl() {
        port = getInt(PARAM_PORT, DEFAULT_PORT);
        enabled = getBoolean(PARAM_ENABLED, true);
    }

    @Override
    protected void updateConfigsImpl(int fileVersion) {
        // Nothing to do for version 1
    }

    /**
     * Gets the port for the Web UI server.
     *
     * @return the port number
     */
    public int getPort() {
        return port;
    }

    /**
     * Sets the port for the Web UI server.
     *
     * @param port the port number (1-65535)
     * @throws IllegalArgumentException if the port is invalid
     */
    public void setPort(int port) {
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("Port must be between 1 and 65535");
        }
        this.port = port;
        getConfig().setProperty(PARAM_PORT, port);
    }

    /**
     * Returns whether the Web UI server is enabled.
     *
     * @return true if enabled
     */
    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Sets whether the Web UI server is enabled.
     *
     * @param enabled true to enable, false to disable
     */
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        getConfig().setProperty(PARAM_ENABLED, enabled);
    }
}
