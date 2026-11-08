declare const process: { env: Record<string, string | undefined> }

export default {
  fetch() {
    const gateway = Boolean(process.env.AI_GATEWAY_API_KEY)
    return Response.json({
      configured: gateway || Boolean(process.env.MOONSHOT_API_KEY),
      model: process.env.AI_MODEL || (gateway ? 'moonshotai/kimi-k2.6' : 'kimi-k2.6'),
    })
  },
}
