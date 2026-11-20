package com.fishcaring.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Custom settings under the {@code app} prefix in application.yml. */
@ConfigurationProperties("app")
public record AppProperties(String corsAllowedOrigin) {
}
