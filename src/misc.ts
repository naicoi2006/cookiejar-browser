import { URL } from "url";
import punycode from "punycode";
import psl from "psl";
import _ from "lodash";
import dayjs from "dayjs";
import { CONTROL_CHARS, IP_REGEX_LOWERCASE, TERMINATORS } from "./var";
import Cookie from "./cookie";

export const parse = (str: string) => {
	const cookie_avs = _.split(_.trim(str), ";");
	const cookiePair = _.first(cookie_avs);
	const cookie: Cookie = parseCookiePair(cookiePair);
	if (!cookie) return;
	for (const cookie_av of _.tail(cookie_avs)) {
		const av = _.trim(cookie_av);
		if (!av) continue;
		const av_sep = av.indexOf("=");
		const av_key = _.toLower(
			_.trim(av_sep === -1 ? av : av.substr(0, av_sep))
		);
		const av_value = av_sep === -1 ? null : _.trim(av.substr(av_sep + 1));
		switch (av_key) {
			case "max-age":
				if (av_value) {
					if (/^-?[0-9]+$/.test(av_value)) {
						cookie.expires = dayjs()
							.add(parseInt(av_value, 10), "s")
							.unix();
					}
				}
				break;
			case "expires":
				if (!cookie.expires)
					cookie.expires = av_value
						? dayjs(av_value).unix() || -1
						: -1;
				break;
			case "domain":
				if (av_value) {
					const domain = _.trim(av_value);
					if (domain) cookie.domain = _.toLower(domain);
				}
				break;
			case "path":
				cookie.path = _.startsWith(av_value, "/") ? av_value : "/";
				break;
			case "secure":
				cookie.secure = true;
				break;
			case "httponly":
				cookie.httpOnly = true;
				break;
			case "samesite":
				const enforcement = av_value ? _.toLower(av_value) : "";
				switch (enforcement) {
					case "strict":
						cookie.sameSite = "Strict";
						break;
					case "lax":
						cookie.sameSite = "Lax";
						break;
					default:
						cookie.sameSite = "None";
						break;
				}
				break;
		}
	}
	return cookie;
};

export const getCookieContext = (url: string) => {
	try {
		return new URL(decodeURI(url));
	} catch (err) {
		return;
	}
};

export const canonicalDomain = (str: string) => {
	str = str.trim().replace(/^\./, "");
	if (/[^\u0001-\u007f]/.test(str)) str = punycode.toASCII(str);
	return str.toLowerCase();
};

export const getPublicSuffix = (domain: string) => {
	return psl.get(canonicalDomain(domain));
};

export const domainMatch = (hostDomain: string, cookieDomain: string) => {
	if (hostDomain == null || cookieDomain == null) return null;
	if (hostDomain === cookieDomain || `.${hostDomain}` === cookieDomain)
		return true;
	const idx = hostDomain.indexOf(cookieDomain);
	if (idx < 0) return false;
	if (hostDomain.length !== cookieDomain.length + idx) return false;
	if (hostDomain.substr(idx, 1) !== ".") return false; // doesn't align on "."
	return !IP_REGEX_LOWERCASE.test(hostDomain);
};
export const pathMatch = (requestPath: string, cookiePath: string) => {
	if (cookiePath === requestPath) return true;
	if (_.startsWith(requestPath, cookiePath)) {
		if (cookiePath.substr(-1) === "/") return true;
		if (requestPath.substr(cookiePath.length, 1) === "/") return true;
	}
	return false;
};

export const defaultPath = (path: string) => {
	if (!path || path.substr(0, 1) !== "/") return "/";
	if (path === "/") return path;
	const rightSlash = path.lastIndexOf("/");
	if (rightSlash === 0) return "/";
	return path.slice(0, rightSlash);
};

export const parseCookiePair = (cookiePair: string) => {
	cookiePair = trimTerminator(cookiePair);
	const firstEq = cookiePair.indexOf("=");
	if (firstEq <= 0) return;
	const cookieName = cookiePair.substr(0, firstEq).trim();
	const cookieValue = cookiePair.substr(firstEq + 1).trim();
	if (CONTROL_CHARS.test(cookieName) || CONTROL_CHARS.test(cookieValue))
		return;
	if (!cookieName || !cookieValue) return;
	const c = new Cookie();
	c.name = cookieName;
	c.value = cookieValue;
	return c;
};

const trimTerminator = (str: string) => {
	for (const TERMINATOR of TERMINATORS) {
		const terminatorIdx = str.indexOf(TERMINATOR);
		if (terminatorIdx !== -1) str = str.substr(0, terminatorIdx);
	}
	return str;
};
export const permuteDomain = (domain: string) => {
	const pubSuf = getPublicSuffix(domain);
	if (!pubSuf) return null;
	if (pubSuf == domain) return [domain];
	const prefix = domain.slice(0, -(pubSuf.length + 1));
	const parts = prefix.split(".").reverse();
	let cur = pubSuf;
	const permutations = [cur];
	while (parts.length) {
		cur = `${parts.shift()}.${cur}`;
		permutations.push(cur);
	}
	return permutations;
};
