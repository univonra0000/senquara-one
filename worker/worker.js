/**
 * SENQUARA ONE Cloudflare Worker
 * Optional D1 API. Front-end works offline without this API.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null,{headers:cors});
    try {
      if (url.pathname === "/api/health") return json({ok:true,service:"SENQUARA ONE",time:new Date().toISOString()},cors);
      if (!env.DB) return json({ok:false,error:"D1 binding DB is not configured"},cors,503);
      if (url.pathname === "/api/products" && request.method === "GET") {
        const {results}=await env.DB.prepare("SELECT * FROM products ORDER BY id DESC").all();
        return json(results,cors);
      }
      if (url.pathname === "/api/customers" && request.method === "GET") {
        const {results}=await env.DB.prepare("SELECT * FROM customers ORDER BY id DESC").all();
        return json(results,cors);
      }
      if (url.pathname === "/api/invoices" && request.method === "GET") {
        const {results}=await env.DB.prepare("SELECT * FROM invoices ORDER BY id DESC").all();
        return json(results,cors);
      }
      return json({ok:false,error:"Not found"},cors,404);
    } catch(e){ return json({ok:false,error:String(e)},cors,500); }
  }
};
function json(data,headers,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json",...headers}})}
