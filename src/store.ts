import dayjs from "dayjs";
import _ from "lodash";
import Cookie from "./cookie";
import { pathMatch, permuteDomain } from "./misc";

class CookieStore {
	cookies: Cookie[];
	constructor() {
		this.cookies = [];
	}
	findCookies(hostname: string, pathname: string, secure: boolean = true) {
		if (!hostname) return [];
		const domains = [..._.map(permuteDomain(hostname) || [hostname], (domain) => `.${domain}`), hostname];
		return _.filter(this.cookies, (ck) => {
			if (ck.secure && !secure) return false;
			if (ck.expires >= 0 && ck.expires <= dayjs().unix()) {
				this.removeCookie(ck);
				return false;
			}
			return _.includes(domains, ck.domain) && pathMatch(pathname, ck.path);
		});
	}
	putCookie(cookie: Cookie) {
		if (cookie.expires >= 0 && cookie.expires <= dayjs().unix()) {
			this.removeCookie(cookie);
		} else {
			const cookieIndex = _.findIndex(
				this.cookies,
				(ck) => ck.domain === cookie.domain && ck.path === cookie.path && ck.name === cookie.name
			);
			if (cookieIndex >= 0) {
				this.cookies = [...this.cookies.slice(0, cookieIndex), cookie, ...this.cookies.slice(cookieIndex + 1)];
			} else {
				this.cookies = [...this.cookies, cookie];
			}
		}
	}
	removeCookie(cookie: Cookie) {
		const cookieIndex = _.findIndex(
			this.cookies,
			(ck) => ck.domain === cookie.domain && ck.path === cookie.path && ck.name === cookie.name
		);
		if (cookieIndex >= 0) {
			this.cookies = [...this.cookies.slice(0, cookieIndex), ...this.cookies.slice(cookieIndex + 1)];
		}
	}
}

export default CookieStore;
