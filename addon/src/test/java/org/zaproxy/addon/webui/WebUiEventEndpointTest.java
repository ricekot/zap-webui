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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Collections;
import net.sf.json.JSONObject;
import org.apache.commons.httpclient.URI;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.parosproxy.paros.model.HistoryReference;
import org.parosproxy.paros.model.SiteNode;

/** Unit tests for {@link WebUiEventEndpoint}. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WebUiEventEndpointTest {

    @Test
    void serializeSiteNode_shouldIncludeRootNodeName() {
        SiteNode rootNode = mock(SiteNode.class);
        when(rootNode.getParent()).thenReturn(null);
        when(rootNode.getHierarchicNodeName()).thenReturn("Sites");
        when(rootNode.getChildCount()).thenReturn(0);

        JSONObject result = WebUiEventEndpoint.serializeSiteNode(rootNode, false);

        assertEquals("Sites", result.getString("node"));
        assertEquals("Sites", result.getString("hierarchicNodeName"));
    }

    @Test
    void serializeSiteNode_shouldIncludeNodeName() {
        SiteNode parentNode = mock(SiteNode.class);
        SiteNode node = mock(SiteNode.class);
        when(node.getParent()).thenReturn(parentNode);
        when(node.getNodeName()).thenReturn("https://example.com");
        when(node.getHierarchicNodeName()).thenReturn("https://example.com");
        when(node.getChildCount()).thenReturn(0);

        JSONObject result = WebUiEventEndpoint.serializeSiteNode(node, false);

        assertEquals("https://example.com", result.getString("node"));
        assertEquals("https://example.com", result.getString("hierarchicNodeName"));
    }

    @Test
    void serializeSiteNode_shouldIncludeHistoryReferenceData() throws Exception {
        SiteNode parentNode = mock(SiteNode.class);
        SiteNode node = mock(SiteNode.class);
        HistoryReference href = mock(HistoryReference.class);

        when(node.getParent()).thenReturn(parentNode);
        when(node.getNodeName()).thenReturn("GET:users");
        when(node.getHierarchicNodeName()).thenReturn("https://example.com/api/GET:users");
        when(node.getHistoryReference()).thenReturn(href);
        when(node.getChildCount()).thenReturn(0);

        when(href.getURI()).thenReturn(new URI("https://example.com/api/users", true));
        when(href.getMethod()).thenReturn("GET");
        when(href.getStatusCode()).thenReturn(200);
        when(href.getResponseHeaderLength()).thenReturn(100);
        when(href.getResponseBodyLength()).thenReturn(500);
        when(href.getHistoryId()).thenReturn(42);

        JSONObject result = WebUiEventEndpoint.serializeSiteNode(node, false);

        assertEquals("GET:users", result.getString("node"));
        assertEquals("https://example.com/api/users", result.getString("url"));
        assertEquals("GET", result.getString("method"));
        assertEquals(200, result.getInt("statusCode"));
        assertEquals(602, result.getInt("responseLength")); // 100 + 500 + 2
        assertEquals(42, result.getInt("messageId"));
    }

    @Test
    void serializeSiteNode_shouldNotIncludeStatusCodeWhenZero() throws Exception {
        SiteNode parentNode = mock(SiteNode.class);
        SiteNode node = mock(SiteNode.class);
        HistoryReference href = mock(HistoryReference.class);

        when(node.getParent()).thenReturn(parentNode);
        when(node.getNodeName()).thenReturn("folder");
        when(node.getHierarchicNodeName()).thenReturn("https://example.com/folder");
        when(node.getHistoryReference()).thenReturn(href);
        when(node.getChildCount()).thenReturn(0);

        when(href.getURI()).thenReturn(new URI("https://example.com/folder", true));
        when(href.getMethod()).thenReturn("GET");
        when(href.getStatusCode()).thenReturn(0);
        when(href.getHistoryId()).thenReturn(1);

        JSONObject result = WebUiEventEndpoint.serializeSiteNode(node, false);

        assertFalse(result.has("statusCode"));
        assertFalse(result.has("responseLength"));
    }

    @Test
    void serializeSiteNode_shouldIncludeChildrenWhenRequested() {
        SiteNode parentNode = mock(SiteNode.class);
        SiteNode node = mock(SiteNode.class);
        SiteNode childNode = mock(SiteNode.class);

        when(node.getParent()).thenReturn(parentNode);
        when(node.getNodeName()).thenReturn("api");
        when(node.getHierarchicNodeName()).thenReturn("https://example.com/api");
        when(node.getChildCount()).thenReturn(1);
        when(node.children())
                .thenReturn(Collections.enumeration(Collections.singletonList(childNode)));

        when(childNode.getParent()).thenReturn(node);
        when(childNode.getNodeName()).thenReturn("users");
        when(childNode.getHierarchicNodeName()).thenReturn("https://example.com/api/users");
        when(childNode.getChildCount()).thenReturn(0);

        JSONObject result = WebUiEventEndpoint.serializeSiteNode(node, true);

        assertTrue(result.has("children"));
        assertEquals(1, result.getJSONArray("children").size());
        assertEquals("users", result.getJSONArray("children").getJSONObject(0).getString("node"));
    }

    @Test
    void serializeSiteNode_shouldNotIncludeChildrenWhenNotRequested() {
        SiteNode parentNode = mock(SiteNode.class);
        SiteNode node = mock(SiteNode.class);

        when(node.getParent()).thenReturn(parentNode);
        when(node.getNodeName()).thenReturn("api");
        when(node.getHierarchicNodeName()).thenReturn("https://example.com/api");
        when(node.getChildCount()).thenReturn(5); // Has children

        JSONObject result = WebUiEventEndpoint.serializeSiteNode(node, false);

        assertFalse(result.has("children"));
    }

    @Test
    void serializeSiteNode_shouldHandleNullHistoryReference() {
        SiteNode parentNode = mock(SiteNode.class);
        SiteNode node = mock(SiteNode.class);

        when(node.getParent()).thenReturn(parentNode);
        when(node.getNodeName()).thenReturn("folder");
        when(node.getHierarchicNodeName()).thenReturn("https://example.com/folder");
        when(node.getHistoryReference()).thenReturn(null);
        when(node.getChildCount()).thenReturn(0);

        JSONObject result = WebUiEventEndpoint.serializeSiteNode(node, false);

        assertNotNull(result);
        assertEquals("folder", result.getString("node"));
        assertFalse(result.has("url"));
        assertFalse(result.has("method"));
    }
}
