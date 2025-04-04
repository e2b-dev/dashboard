const HOSTS = {
	base: 'web-e2b.vercel.app',
	landingPage: 'www.e2b-landing-page.com',
	landingPageFramer: 'e2b-landing-page.framer.website',
	blogFramer: 'e2b-blog.framer.website',
	docsNext: 'e2b-web-e2b.vercel.app',
};

class AttributeRewriter {
	private attributeName: string;
	private oldUrl: string;
	private newUrl: string;

	constructor(attributeName: string, oldUrl: string, newUrl: string) {
		this.attributeName = attributeName;
		this.oldUrl = oldUrl;
		this.newUrl = newUrl;
	}
	element(element: Element) {
		const attribute = element.getAttribute(this.attributeName);
		if (attribute) {
			element.setAttribute(this.attributeName, attribute.replace(this.oldUrl, this.newUrl));
		}
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== 'GET') {
			return fetch(request);
		}

		const url = new URL(request.url);
		const requestHostname = url.hostname;

		const updateUrlHostname = (newHostname: string, extraInfo?: Record<string, unknown>) => {
			url.hostname = newHostname;
			url.port = '';
			url.protocol = 'https';
		};

		if (url.pathname === '' || url.pathname === '/') {
			updateUrlHostname(HOSTS.landingPage);
		} else if (url.pathname.startsWith('/blog/category')) {
			const originalPath = url.pathname;
			url.pathname = url.pathname.replace(/^\/blog/, '');
			updateUrlHostname(HOSTS.landingPage);
		} else {
			const hostnameMap: Record<string, string> = {
				'/terms': HOSTS.landingPage,
				'/privacy': HOSTS.landingPage,
				'/pricing': HOSTS.landingPage,
				'/cookbook': HOSTS.landingPage,
				'/changelog': HOSTS.landingPage,
				'/blog': HOSTS.landingPage,
				'/ai-agents': HOSTS.landingPageFramer,
				'/docs': HOSTS.docsNext,
			};

			const matchingPath = Object.keys(hostnameMap).find((path) => url.pathname === path || url.pathname.startsWith(path + '/'));

			if (matchingPath) {
				updateUrlHostname(hostnameMap[matchingPath]);
			}
		}

		if (url.hostname === requestHostname) {
			updateUrlHostname(HOSTS.base);
		}

		try {
			const headers = new Headers(request.headers);

			const res = await fetch(url.toString(), {
				...request,
				headers,
				redirect: 'follow',
			});

			const contentType = res.headers.get('Content-Type');

			if (contentType?.startsWith('text/html')) {
				const rewriter = new HTMLRewriter()
					.on('a', new AttributeRewriter('href', requestHostname, url.hostname))
					.on('img', new AttributeRewriter('src', requestHostname, url.hostname));

				return rewriter.transform(res);
			}

			return res;
		} catch (error) {
			return new Response(`Proxy Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
				status: 502,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
	},
} satisfies ExportedHandler<Env>;
