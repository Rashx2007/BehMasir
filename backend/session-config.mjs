// Cookies are scoped to host/path, NOT port. Parallel environments need distinct names.
export function sessionCookieName(env = process.env) {
  const name = env.SESSION_COOKIE_NAME ?? "__Host-behmasir";
  if (typeof name !== "string" || !/^__Host-[A-Za-z0-9_-]{1,64}$/.test(name)) {
    throw new Error(
      "SESSION_COOKIE_NAME باید نام معتبر و مستقلی با پیشوند __Host- باشد.",
    );
  }
  return name;
}
