#!/usr/bin/env node
/**
 * Beeper API接続テストスクリプト
 * 使い方: npx tsx test-beeper-api.ts [API_TOKEN]
 */

const DEFAULT_BASE_URL = "http://localhost:23373/v0/mcp";

interface JsonRpcError {
  code?: number;
  message?: string;
  data?: unknown;
}

interface JsonRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: JsonRpcError;
}

async function testBeeperApi(authToken?: string) {
  console.log("=== Beeper API接続テスト ===\n");
  
  const endpoints = [
    "http://localhost:23373",
    "http://localhost:23373/v0",
    "http://localhost:23373/v0/mcp",
    "http://localhost:23373/mcp",
  ];

  const methods = [
    "ping",
    "whoami",
    "chats.list",
    "chats.search",
    "tools/list",
    "initialize",
  ];

  for (const baseUrl of endpoints) {
    console.log(`\n📍 エンドポイント: ${baseUrl}`);
    console.log("─".repeat(60));

    for (const method of methods) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: method === "initialize" 
          ? {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: { name: "test", version: "1.0" }
            }
          : method === "chats.search"
          ? { type: "single", limit: 1 }
          : {},
      });

      try {
        console.log(`\n🔍 メソッド: ${method}`);
        console.log(`   リクエスト: ${body.substring(0, 100)}...`);
        
        const response = await fetch(baseUrl, {
          method: "POST",
          headers,
          body,
        });

        const text = await response.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }

        console.log(`   ステータス: ${response.status} ${response.statusText}`);
        console.log(`   レスポンス: ${JSON.stringify(parsed).substring(0, 200)}`);

        if (response.ok && parsed && typeof parsed === "object") {
          const rpc = parsed as JsonRpcResponse<unknown>;
          if (rpc.result !== undefined) {
            console.log(`   ✅ 成功！`);
            console.log(`\n🎉 正しいエンドポイント: ${baseUrl}`);
            console.log(`🎉 正しいメソッド: ${method}`);
            console.log(`\n完全なレスポンス:`);
            console.log(JSON.stringify(parsed, null, 2));
            return;
          } else if (rpc.error) {
            console.log(`   ❌ RPCエラー: ${rpc.error.code} - ${rpc.error.message}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  console.log("\n\n❌ すべてのエンドポイントとメソッドの組み合わせで失敗しました。");
  console.log("\n💡 確認事項:");
  console.log("1. Beeper Desktopが起動しているか");
  console.log("2. Beeper Desktop設定でAPIが有効になっているか");
  console.log("3. ポート23373が正しいか");
  console.log("4. APIトークンが正しいか（設定されている場合）");
}

const authToken = process.argv[2];
if (authToken) {
  console.log(`🔑 APIトークンを使用: ${authToken.substring(0, 10)}...`);
} else {
  console.log("ℹ️  APIトークンなしでテスト");
}

testBeeperApi(authToken).catch(console.error);
