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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Unit tests for {@link WebUiParam}. */
class WebUiParamTest {

    @Test
    void shouldHaveDefaultPort() {
        assertEquals(9999, WebUiParam.DEFAULT_PORT);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, -100, 65536, 100000})
    void shouldRejectInvalidPort(int invalidPort) {
        WebUiParam param = new WebUiParam();

        assertThrows(IllegalArgumentException.class, () -> param.setPort(invalidPort));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 80, 443, 8080, 9999, 65535})
    void shouldAcceptValidPort(int validPort) {
        WebUiParam param = new WebUiParam();

        // This will throw because config is not set up, but the validation should pass
        // We catch the NPE that comes from getConfig() being null
        try {
            param.setPort(validPort);
        } catch (NullPointerException e) {
            // Expected because getConfig() returns null without proper ZAP initialization
            // The fact that we got here means validation passed
        }

        // Verify the port was set (the setter sets the field before calling getConfig)
        assertEquals(validPort, param.getPort());
    }
}
