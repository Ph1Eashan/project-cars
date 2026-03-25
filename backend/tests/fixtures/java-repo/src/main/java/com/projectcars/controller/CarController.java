package com.projectcars.controller;

import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/cars")
public class CarController {

  @GetMapping
  public String listCars() {
    return "cars";
  }

  @PostMapping
  public String createCar(@Valid @RequestBody String body) {
    return body;
  }
}
