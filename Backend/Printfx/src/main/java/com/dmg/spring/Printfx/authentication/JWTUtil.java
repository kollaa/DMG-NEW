package com.dmg.spring.Printfx.authentication;

import java.security.Key;
import java.util.Date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Component
public class JWTUtil {

	private static final Logger log = LoggerFactory.getLogger(JWTUtil.class);

	// The signing key must stay the SAME across restarts, otherwise every
	// redeploy/restart logs everyone out. On Azure it comes from the
	// JWT_SECRET environment variable (a base64 string of at least 32 bytes).
	private static final Key SECRET_KEY = loadKey();

	private static Key loadKey() {
		String secret = System.getenv("JWT_SECRET");
		if (secret != null && !secret.isBlank()) {
			return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret.trim()));
		}
		log.warn("JWT_SECRET is not set; using a random key. Everyone will be logged out "
				+ "whenever the backend restarts. Fine for local development only.");
		return Keys.secretKeyFor(SignatureAlgorithm.HS256);
	}

	public static String generateToken(String email, boolean rememberMe) {
		long expirationTime = rememberMe ? 1000L * 60 * 60 * 24 * 7 : 1000L * 60 * 60;

		return Jwts.builder()
				.setSubject(email)
				.setIssuedAt(new Date())
				.setExpiration(new Date(System.currentTimeMillis() + expirationTime))
				.signWith(SECRET_KEY)
				.compact();
	}

	public static boolean validateToken(String token) {
		try {
			Jwts.parserBuilder().setSigningKey(SECRET_KEY).build().parseClaimsJws(token);
			return true;
		} catch (Exception e) {
			return false; // Token invalid or expired
		}
	}

	public static String getEmailFromToken(String token) {
		return Jwts.parserBuilder()
				.setSigningKey(SECRET_KEY)
				.build()
				.parseClaimsJws(token)
				.getBody()
				.getSubject();
	}
}