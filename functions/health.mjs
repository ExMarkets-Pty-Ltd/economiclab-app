export default async function health() {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
