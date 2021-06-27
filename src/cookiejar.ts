import Cookie from "./cookie";
import _ from "lodash";
import {
	canonicalDomain,
	defaultPath,
	domainMatch,
	getCookieContext,
	getPublicSuffix,
	parse,
} from "./misc";
import CookieStore from "./store";
import { CookieInterface } from "./var";
class CookieJar {
	strictMode: boolean;
	rejectPublicSuffixes: boolean;
	store: CookieStore;
	constructor(options: any = { strict: true, rejectPublicSuffixes: true }) {
		this.strictMode = !!options.strict;
		this.rejectPublicSuffixes = !!options.rejectPublicSuffixes;
		this.store = new CookieStore();
	}
	setCookie(
		cookieString: string,
		url: string,
		callback: (error: Error | null, result: unknown) => void
	) {
		const context = getCookieContext(url);
		const cookie: Cookie = parse(cookieString);
		if (!cookie)
			return callback(new Error("Cannot parse Set-Cookie string"), null);
		if (this.rejectPublicSuffixes && cookie.domain) {
			const suffix = getPublicSuffix(cookie.domain);
			if (suffix == null) return;
		}
		if (!cookie.secure && _.startsWith(cookie.name, "__Secure-"))
			return callback(
				new Error("Cookie name starts with __Secure- must have Secure"),
				null
			);
		if (!cookie.path || !_.startsWith(cookie.path, "/")) {
			const pathname: string = _.get(context, "pathname", "/");
			cookie.path = defaultPath(pathname);
		}
		if (!cookie.expires) cookie.expires = -1;
		if (
			!(cookie.secure && !cookie.domain && cookie.path === "/") &&
			_.startsWith(cookie.name, "__Host-")
		)
			return callback(
				new Error(
					"Cookie name starts with __Host- must have Secure or don't have Domain and Default Path"
				),
				null
			);
		const hostname: string = _.get(context, "hostname", "");
		if (cookie.domain) {
			if (this.strictMode) {
				if (!domainMatch(hostname, cookie.domain)) {
					if (
						domainMatch(
							hostname,
							`.${canonicalDomain(cookie.domain)}`
						)
					)
						cookie.domain = `.${canonicalDomain(cookie.domain)}`;
					else
						callback(
							new Error(
								"Not match Domain with URL on Strict Mode"
							),
							null
						);
				}
			}
		} else {
			if (!hostname)
				callback(new Error("Not found Domain or hostname"), null);
			cookie.domain = hostname;
		}
		this.store.putCookie(cookie);
		callback(null, cookie);
		return cookie;
	}
	getCookies(url: string) {
		const context = getCookieContext(url);
		const hostname: string = _.get(context, "hostname", "");
		const pathname: string = _.get(context, "pathname", "/");
		const protocol: string = _.get(context, "protocol", "http:");
		const secure = protocol === "https:" || protocol === "wss:";
		return _.sortBy(
			this.store.findCookies(hostname, pathname, secure),
			(ck: Cookie) => -ck.path.length
		);
	}
	getCookieString(
		url: string,
		callback: (error: Error | null, cookieHeader: string) => void
	) {
		const cookieString = _.join(
			_.map(this.getCookies(url), (ck: Cookie) => ck.cookieString()),
			"; "
		);
		callback(null, cookieString);
		return cookieString;
	}
	addCookie(cookie: Cookie) {
		this.store.putCookie(cookie);
	}
	toJSON() {
		return JSON.stringify(this.store.cookies);
	}
	static fromJSON(jsonString: string, options: any = {}) {
		const cookies = JSON.parse(jsonString);
		return CookieJar.import(cookies, options);
	}
	export() {
		return _.map(this.store.cookies, (ck: Cookie) => ck.export());
	}
	static import(cookies: CookieInterface[], options: any = {}) {
		const jar = new CookieJar(options);
		for (const cookie of cookies) jar.addCookie(Cookie.import(cookie));
		return jar;
	}
}

export default CookieJar;
