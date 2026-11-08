export default {
  fetch() {
    return Response.json({
      configured: Boolean(process.env.MOONSHOT_API_KEY),
      model: process.env.AI_MODEL || 'kimi-k2.6',
    })
  },
}
