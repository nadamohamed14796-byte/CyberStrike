import { describe, expect, test } from "bun:test"
import { extractApiSources, parseOpenApiJson } from "../src/api-document"

describe("OpenAPI source extraction", () => {
  test("extracts methods and preserves server URLs", () => {
    const sources=extractApiSources({
      servers:[{url:"https://api.example.com/v1"}],
      paths:{
        "/users":{"get":{},"post":{}},
        "/users/{id}":{"get":{}},
      },
    })
    expect(sources).toEqual([
      {endpoint:"https://api.example.com/v1/users",method:"GET",source:"swagger"},
      {endpoint:"https://api.example.com/v1/users",method:"POST",source:"swagger"},
      {endpoint:"https://api.example.com/v1/users/{id}",method:"GET",source:"swagger"},
    ])
  })

  test("returns no sources for malformed JSON", () => {
    expect(parseOpenApiJson("{bad")).toEqual([])
  })
})
