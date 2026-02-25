export const inferWorkspaceDomainFromHost = (hostInput?: string): string | undefined => {
  const host = (hostInput || window.location.hostname || '').toLowerCase().trim();
  if (!host || host === 'localhost') return undefined;

  if (host.endsWith('.localhost')) {
    const subdomain = host.replace(/\.localhost$/, '').split('.')[0]?.trim();
    return subdomain ? `${subdomain}.localhost` : undefined;
  }

  if (host.endsWith('.velo.ai')) {
    const subdomain = host.replace(/\.velo\.ai$/, '').split('.')[0]?.trim();
    return subdomain ? `${subdomain}.velo.ai` : undefined;
  }

  return undefined;
};

export const isWorkspaceSubdomainHost = (hostInput?: string): boolean =>
  Boolean(inferWorkspaceDomainFromHost(hostInput));

export const getMainSiteUrlFromHost = (hostInput?: string): string => {
  const protocol = window.location.protocol || 'http:';
  const host = (hostInput || window.location.hostname || '').toLowerCase().trim();
  const port = window.location.port || '';

  if (host.endsWith('.localhost')) {
    const localPort = port || '3000';
    return `${protocol}//localhost:${localPort}`;
  }

  if (host.endsWith('.velo.ai')) {
    return 'https://velo.ai';
  }

  return `${protocol}//${window.location.host}`;
};
