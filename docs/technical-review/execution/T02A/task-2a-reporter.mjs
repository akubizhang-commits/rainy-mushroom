function errorRecord(error) {
  if (!error) return undefined
  return {
    name: error.name, code: error.code, message: error.message,
    stack: error.stack, cause: errorRecord(error.cause),
  }
}
export default async function* report(source) {
  for await (const event of source) {
    if (!['test:pass', 'test:fail', 'test:summary'].includes(event.type)) continue
    const { details, ...data } = event.data
    yield JSON.stringify({ type: event.type, ...data,
      ...(details && { details: { ...details, error: errorRecord(details.error) } }),
    }) + '\n'
  }
}
