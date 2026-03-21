export const resolveStudioProxyGatewayUrl = (): string => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const { hostname, host, port } = window.location;
  if (port === "18789") {
    return `${protocol}://${hostname}:3001/api/gateway/ws`;
  }
  return `${protocol}://${host}/api/gateway/ws`;
};
