package com.fishcaring.service;

import com.fishcaring.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** Reads the id of the logged-in user from the security context. Never take a user id from the client. */
@Component
public class CurrentUser {

    public long id() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            throw UnauthorizedException.unauthorized();
        }
        try {
            return Long.parseLong(jwtAuth.getName());
        } catch (NumberFormatException e) {
            throw UnauthorizedException.unauthorized();
        }
    }
}
