package com.projectcars.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cars")
public class RouteController {

  @GetMapping("/health")
  public String health() {
    return "ok";
  }

  @GetMapping
  public String list() {
    return "list";
  }

  @PostMapping
  public String create() {
    return "create";
  }

  @PatchMapping("/{id}")
  public String update() {
    return "update";
  }

  @DeleteMapping("/{id}")
  public String remove() {
    return "remove";
  }
}
