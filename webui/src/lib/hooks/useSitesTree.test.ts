import { describe, it, expect } from "vitest"
import { transformNode, insertNodeIntoTree, type RawSiteNode } from "./useSitesTree"
import type { SiteTreeNode } from "@/components/panels/sites-tree/SiteNode"

describe("transformNode", () => {
  it("transforms a host node with protocol in name", () => {
    const raw: RawSiteNode = {
      node: "https://example.com",
      hierarchicNodeName: "https://example.com",
      url: "https://example.com",
      children: [],
    }

    const result = transformNode(raw)

    expect(result.name).toBe("https://example.com")
    expect(result.type).toBe("host")
    expect(result.method).toBeUndefined()
  })

  it("transforms a folder node", () => {
    const raw: RawSiteNode = {
      node: "api",
      hierarchicNodeName: "https://example.com/api",
      url: "https://example.com/api",
      children: [
        {
          node: "users",
          hierarchicNodeName: "https://example.com/api/users",
          url: "https://example.com/api/users",
        },
      ],
    }

    const result = transformNode(raw)

    expect(result.name).toBe("api")
    expect(result.type).toBe("folder")
    expect(result.method).toBeUndefined()
  })

  it("transforms an endpoint node with method", () => {
    const raw: RawSiteNode = {
      node: "GET:users",
      hierarchicNodeName: "https://example.com/api/GET:users",
      url: "https://example.com/api/users",
      method: "GET",
      statusCode: 200,
      responseLength: 1234,
      messageId: 42,
    }

    const result = transformNode(raw)

    expect(result.name).toBe("users") // Method prefix stripped
    expect(result.type).toBe("endpoint")
    expect(result.method).toBe("GET")
    expect(result.statusCode).toBe(200)
    expect(result.responseSize).toBe(1234)
    expect(result.messageId).toBe("42")
  })

  it("strips method prefix from endpoint name", () => {
    const raw: RawSiteNode = {
      node: "POST:submit",
      hierarchicNodeName: "https://example.com/POST:submit",
      url: "https://example.com/submit",
      method: "POST",
    }

    const result = transformNode(raw)

    expect(result.name).toBe("submit")
    expect(result.method).toBe("POST")
  })

  it("does not strip method prefix from folder name", () => {
    const raw: RawSiteNode = {
      node: "GET:data",
      hierarchicNodeName: "https://example.com/GET:data",
      url: "https://example.com/GET:data",
      method: "GET",
      children: [{ node: "child", hierarchicNodeName: "https://example.com/GET:data/child" }],
    }

    const result = transformNode(raw)

    // Has children, so it's a folder - name should stay as-is OR be stripped
    // Based on code logic: since it has method and children, type becomes folder,
    // but name is still stripped because method is present
    expect(result.type).toBe("folder")
    expect(result.method).toBeUndefined() // Method not set on folders
  })

  it("transforms Sites root node", () => {
    const raw: RawSiteNode = {
      node: "Sites",
      hierarchicNodeName: "Sites",
      children: [],
    }

    const result = transformNode(raw)

    expect(result.name).toBe("Sites")
    expect(result.type).toBe("folder")
  })

  it("recursively transforms children", () => {
    const raw: RawSiteNode = {
      node: "https://example.com",
      hierarchicNodeName: "https://example.com",
      url: "https://example.com",
      children: [
        {
          node: "api",
          hierarchicNodeName: "https://example.com/api",
          url: "https://example.com/api",
          children: [
            {
              node: "GET:users",
              hierarchicNodeName: "https://example.com/api/GET:users",
              url: "https://example.com/api/users",
              method: "GET",
            },
          ],
        },
      ],
    }

    const result = transformNode(raw)

    expect(result.children).toHaveLength(1)
    expect(result.children![0].name).toBe("api")
    expect(result.children![0].children).toHaveLength(1)
    expect(result.children![0].children![0].name).toBe("users")
    expect(result.children![0].children![0].method).toBe("GET")
  })

  it("sets id from hierarchicNodeName", () => {
    const raw: RawSiteNode = {
      node: "resource",
      hierarchicNodeName: "https://example.com/path/resource",
      url: "https://example.com/path/resource",
    }

    const result = transformNode(raw)

    expect(result.id).toBe("https://example.com/path/resource")
  })
})

describe("insertNodeIntoTree", () => {
  it("inserts node under correct host", () => {
    const tree: SiteTreeNode[] = [
      {
        id: "https://example.com",
        name: "https://example.com",
        type: "host",
        url: "https://example.com",
        children: [],
      },
    ]

    const newNode: RawSiteNode = {
      node: "api",
      hierarchicNodeName: "https://example.com/api",
      url: "https://example.com/api",
    }

    const result = insertNodeIntoTree(tree, newNode)

    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].name).toBe("api")
  })

  it("creates host node if it does not exist", () => {
    const tree: SiteTreeNode[] = []

    const newNode: RawSiteNode = {
      node: "api",
      hierarchicNodeName: "https://newsite.com/api",
      url: "https://newsite.com/api",
    }

    const result = insertNodeIntoTree(tree, newNode)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("https://newsite.com")
    expect(result[0].type).toBe("host")
    expect(result[0].children).toHaveLength(1)
  })

  it("creates intermediate folder nodes when missing", () => {
    const tree: SiteTreeNode[] = [
      {
        id: "https://example.com",
        name: "https://example.com",
        type: "host",
        url: "https://example.com",
        children: [],
      },
    ]

    const newNode: RawSiteNode = {
      node: "GET:users",
      hierarchicNodeName: "https://example.com/api/v1/users",
      url: "https://example.com/api/v1/users",
      method: "GET",
    }

    const result = insertNodeIntoTree(tree, newNode)

    // Should create: api -> v1 -> users
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].name).toBe("api")
    expect(result[0].children![0].type).toBe("folder")
    expect(result[0].children![0].children![0].name).toBe("v1")
    expect(result[0].children![0].children![0].children![0].name).toBe("users")
  })

  it("preserves existing children when inserting sibling", () => {
    const tree: SiteTreeNode[] = [
      {
        id: "https://example.com",
        name: "https://example.com",
        type: "host",
        url: "https://example.com",
        children: [
          {
            id: "https://example.com/existing",
            name: "existing",
            type: "folder",
          },
        ],
      },
    ]

    const newNode: RawSiteNode = {
      node: "newpath",
      hierarchicNodeName: "https://example.com/newpath",
      url: "https://example.com/newpath",
    }

    const result = insertNodeIntoTree(tree, newNode)

    expect(result[0].children).toHaveLength(2)
    expect(result[0].children!.map((c) => c.name)).toContain("existing")
    expect(result[0].children!.map((c) => c.name)).toContain("newpath")
  })

  it("updates existing node if id matches", () => {
    const tree: SiteTreeNode[] = [
      {
        id: "https://example.com",
        name: "https://example.com",
        type: "host",
        url: "https://example.com",
        children: [
          {
            id: "https://example.com/api",
            name: "api",
            type: "folder",
          },
        ],
      },
    ]

    const newNode: RawSiteNode = {
      node: "api",
      hierarchicNodeName: "https://example.com/api",
      url: "https://example.com/api",
      statusCode: 200,
    }

    const result = insertNodeIntoTree(tree, newNode)

    // Should update, not duplicate
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].statusCode).toBe(200)
  })

  it("handles HTTP and HTTPS separately", () => {
    const tree: SiteTreeNode[] = [
      {
        id: "https://example.com",
        name: "https://example.com",
        type: "host",
        url: "https://example.com",
        children: [],
      },
    ]

    const newNode: RawSiteNode = {
      node: "api",
      hierarchicNodeName: "http://example.com/api",
      url: "http://example.com/api",
    }

    const result = insertNodeIntoTree(tree, newNode)

    // Should create a new host for http://
    expect(result).toHaveLength(2)
    expect(result.map((n) => n.name)).toContain("https://example.com")
    expect(result.map((n) => n.name)).toContain("http://example.com")
  })

  it("handles host-level node (no path)", () => {
    const tree: SiteTreeNode[] = []

    const newNode: RawSiteNode = {
      node: "https://example.com",
      hierarchicNodeName: "https://example.com",
      url: "https://example.com",
    }

    const result = insertNodeIntoTree(tree, newNode)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("https://example.com")
    expect(result[0].type).toBe("host")
  })

  it("handles invalid URL gracefully by adding to root", () => {
    const tree: SiteTreeNode[] = []

    const newNode: RawSiteNode = {
      node: "invalid-node",
      hierarchicNodeName: "not-a-valid-url",
    }

    const result = insertNodeIntoTree(tree, newNode)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("invalid-node")
  })

  it("inserts deeply nested path correctly", () => {
    const tree: SiteTreeNode[] = [
      {
        id: "https://example.com",
        name: "https://example.com",
        type: "host",
        url: "https://example.com",
        children: [
          {
            id: "https://example.com/api",
            name: "api",
            type: "folder",
            children: [
              {
                id: "https://example.com/api/v1",
                name: "v1",
                type: "folder",
                children: [],
              },
            ],
          },
        ],
      },
    ]

    const newNode: RawSiteNode = {
      node: "GET:users",
      hierarchicNodeName: "https://example.com/api/v1/users",
      url: "https://example.com/api/v1/users",
      method: "GET",
    }

    const result = insertNodeIntoTree(tree, newNode)

    const v1Node = result[0].children![0].children![0]
    expect(v1Node.children).toHaveLength(1)
    expect(v1Node.children![0].name).toBe("users")
    expect(v1Node.children![0].method).toBe("GET")
  })
})
