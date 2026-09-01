if (typeof window !== 'undefined') {
    const PREFIX = process.env.NEXT_PUBLIC_APP_BASE_PATH || ''
    if (PREFIX) {
        const originalFetch = window.fetch.bind(window)
        window.fetch = (url, init) => {
            if (typeof url === 'string' && url.startsWith('/') && !url.startsWith(PREFIX)) {
                url = `${PREFIX}${url}`
            }
            return originalFetch(url, init)
        }
    }
}
