import _ from "lodash";

class Cookie {
	name: string;
	value: string;
	domain: string;
	path: string = "/";
	expires: number;
	secure: boolean = false;
	httpOnly: boolean = false;
	sameSite: "Strict" | "Lax" | "None" = "None";
	cookieString() {
		if (this.name === "") return this.value;
		return `${this.name}=${this.value}`;
	}
	export() {
		return _.toPlainObject(this);
	}
	static import(cookie: object) {
		const ck = new Cookie();
		ck.name = _.get(cookie, "name", "");
		ck.value = _.get(cookie, "value", "");
		ck.domain = _.get(cookie, "domain", "");
		ck.path = _.get(cookie, "path", "/");
		ck.expires = _.get(cookie, "expires", -1);
		ck.secure = _.get(cookie, "secure", false);
		ck.httpOnly = _.get(cookie, "httpOnly", false);
		ck.sameSite = _.get(cookie, "sameSite", "None");
		return ck;
	}
}
export default Cookie;
