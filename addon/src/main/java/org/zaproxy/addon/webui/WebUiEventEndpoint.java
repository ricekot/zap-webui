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

import java.util.Enumeration;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import javax.swing.tree.TreeNode;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.WebSocketAdapter;
import org.eclipse.jetty.websocket.api.WriteCallback;
import org.parosproxy.paros.model.HistoryReference;
import org.parosproxy.paros.model.Model;
import org.parosproxy.paros.model.SiteMap;
import org.parosproxy.paros.model.SiteNode;

/**
 * WebSocket endpoint for the Web UI that provides real-time event updates from ZAP. This endpoint
 * manages connected clients and broadcasts ZAP events to all connected Web UI instances.
 *
 * <p>Events are sent as JSON messages with the following structure:
 *
 * <pre>
 * {
 *   "type": "event-type",
 *   "timestamp": 1234567890,
 *   "data": { ... event-specific data ... }
 * }
 * </pre>
 */
public class WebUiEventEndpoint extends WebSocketAdapter {

    private static final Logger LOGGER = LogManager.getLogger(WebUiEventEndpoint.class);

    /** Root node name for the sites tree. */
    private static final String ROOT_NODE_NAME = "Sites";

    /** Set of all connected client sessions. Thread-safe for concurrent access. */
    private static final Set<Session> SESSIONS = new CopyOnWriteArraySet<>();

    @Override
    public void onWebSocketConnect(Session session) {
        super.onWebSocketConnect(session);
        SESSIONS.add(session);
        LOGGER.debug("Web UI client connected. Total connected clients: {}", SESSIONS.size());

        // Send a welcome message with connection info
        sendWelcomeMessage(session);
    }

    @Override
    public void onWebSocketText(String message) {
        LOGGER.trace("Received message from Web UI client: {}", message);

        // Handle incoming messages from the client
        // Currently, this is primarily for future use (e.g., subscribing to specific events)
        try {
            JSONObject json = JSONObject.fromObject(message);
            String type = json.optString("type", "unknown");

            switch (type) {
                case "ping":
                    // Respond to ping with pong
                    sendMessage(getSession(), createMessage("pong", null));
                    break;
                case "getSitesTree":
                    // Send the full sites tree to the client
                    handleGetSitesTree(getSession());
                    break;
                case "subscribe":
                    // TODO: Handle event subscription requests
                    LOGGER.debug("Subscribe request received: {}", json);
                    break;
                case "unsubscribe":
                    // TODO: Handle event unsubscription requests
                    LOGGER.debug("Unsubscribe request received: {}", json);
                    break;
                default:
                    LOGGER.debug("Unknown message type received: {}", type);
            }
        } catch (Exception e) {
            LOGGER.debug("Failed to parse message from client: {}", message, e);
        }
    }

    @Override
    public void onWebSocketClose(int statusCode, String reason) {
        super.onWebSocketClose(statusCode, reason);
        SESSIONS.remove(getSession());
        LOGGER.debug(
                "Web UI client disconnected: {} - {}. Remaining clients: {}",
                statusCode,
                reason,
                SESSIONS.size());
    }

    @Override
    public void onWebSocketError(Throwable cause) {
        LOGGER.error("WebSocket error", cause);
        Session session = getSession();
        if (session != null) {
            SESSIONS.remove(session);
        }
    }

    /**
     * Sends a welcome message to a newly connected client.
     *
     * @param session the client session
     */
    private void sendWelcomeMessage(Session session) {
        JSONObject data = new JSONObject();
        data.put("version", "1.0");
        data.put("clientCount", SESSIONS.size());
        sendMessage(session, createMessage("connected", data));
    }

    /**
     * Creates a JSON event message.
     *
     * @param type the event type
     * @param data the event data (can be null)
     * @return the JSON message string
     */
    private static String createMessage(String type, JSONObject data) {
        JSONObject message = new JSONObject();
        message.put("type", type);
        message.put("timestamp", System.currentTimeMillis());
        if (data != null) {
            message.put("data", data);
        }
        return message.toString();
    }

    /**
     * Sends a message to a specific client session.
     *
     * @param session the client session
     * @param message the message to send
     */
    private static void sendMessage(Session session, String message) {
        if (session != null && session.isOpen()) {
            session.getRemote().sendString(message, WriteCallback.NOOP);
        }
    }

    /**
     * Broadcasts a message to all connected clients.
     *
     * @param message the message to broadcast
     */
    public static void broadcast(String message) {
        for (Session session : SESSIONS) {
            sendMessage(session, message);
        }
        LOGGER.trace("Broadcast message to {} clients: {}", SESSIONS.size(), message);
    }

    /**
     * Broadcasts an event to all connected clients.
     *
     * @param eventType the type of event
     * @param data the event data (can be null)
     */
    public static void broadcastEvent(String eventType, JSONObject data) {
        if (SESSIONS.isEmpty()) {
            return;
        }
        broadcast(createMessage(eventType, data));
    }

    /**
     * Returns the number of connected clients.
     *
     * @return the number of connected clients
     */
    public static int getConnectedClientCount() {
        return SESSIONS.size();
    }

    /** Closes all connected client sessions. Called when the server is shutting down. */
    public static void closeAllSessions() {
        for (Session session : SESSIONS) {
            try {
                if (session.isOpen()) {
                    session.close(1001, "Server shutting down");
                }
            } catch (Exception e) {
                LOGGER.debug("Error closing session", e);
            }
        }
        SESSIONS.clear();
    }

    /**
     * Handles a request to get the full sites tree.
     *
     * @param session the client session to send the response to
     */
    private void handleGetSitesTree(Session session) {
        try {
            SiteMap siteMap = Model.getSingleton().getSession().getSiteTree();
            SiteNode root = siteMap.getRoot();
            JSONObject treeData = serializeSiteNode(root, true);
            sendMessage(session, createMessage("sitesTree", treeData));
        } catch (Exception e) {
            LOGGER.error("Error getting sites tree", e);
            JSONObject errorData = new JSONObject();
            errorData.put("error", e.getMessage());
            sendMessage(session, createMessage("sitesTree.error", errorData));
        }
    }

    /**
     * Serializes a SiteNode to JSON format for the frontend. This method is also used by
     * ExtensionWebUi for broadcasting sitenode.added events.
     *
     * @param node the site node to serialize
     * @param includeChildren whether to recursively include child nodes
     * @return JSON representation of the node
     */
    static JSONObject serializeSiteNode(SiteNode node, boolean includeChildren) {
        JSONObject json = new JSONObject();

        // Node display name (similar to SitesTreeHandler)
        String nodeName = node.getParent() == null ? ROOT_NODE_NAME : node.getNodeName();
        json.put("node", nodeName);

        // Get hierarchical path for tree positioning
        json.put("hierarchicNodeName", node.getHierarchicNodeName());

        HistoryReference href = node.getHistoryReference();
        if (href != null) {
            try {
                json.put("url", href.getURI().toString());
                json.put("method", href.getMethod());

                if (href.getStatusCode() > 0) {
                    json.put("statusCode", href.getStatusCode());
                    json.put(
                            "responseLength",
                            href.getResponseHeaderLength() + href.getResponseBodyLength() + 2);
                }

                json.put("messageId", href.getHistoryId());
            } catch (Exception e) {
                LOGGER.debug("Error getting history reference data", e);
            }
        }

        // Include children for tree structure (only if requested)
        if (includeChildren && node.getChildCount() > 0) {
            JSONArray children = new JSONArray();
            for (Enumeration<TreeNode> e = node.children(); e.hasMoreElements(); ) {
                SiteNode child = (SiteNode) e.nextElement();
                children.add(serializeSiteNode(child, true));
            }
            json.put("children", children);
        }

        return json;
    }
}
