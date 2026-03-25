package com.projectcars.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http.build();
  }
}
