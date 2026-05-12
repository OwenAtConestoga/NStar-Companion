/*
 * Button direction test
 * Board:   Elegoo Uno R3
 * Display: SSD1306 0.96" OLED, I2C (SDA=A4, SCL=A5), addr 0x3C
 * Buttons: wired to GND, INPUT_PULLUP (LOW = pressed)
 *   UP    = pin 2
 *   DOWN  = pin 3
 *   LEFT  = pin 4
 *   RIGHT = pin 5
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_W  128
#define SCREEN_H  64
Adafruit_SSD1306 display(SCREEN_W, SCREEN_H, &Wire, -1);

#define BTN_UP    2
#define BTN_DOWN  3
#define BTN_LEFT  4
#define BTN_RIGHT 5

#define DEBOUNCE_MS 150

unsigned long lastPress[4] = {0, 0, 0, 0};

bool pressed(int pin, int idx) {
  if (digitalRead(pin) == LOW) {
    unsigned long now = millis();
    if (now - lastPress[idx] > DEBOUNCE_MS) {
      lastPress[idx] = now;
      return true;
    }
  }
  return false;
}

void showDirection(const char* label) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Big label in center
  display.setTextSize(3);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(label, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_W - w) / 2, (SCREEN_H - h) / 2);
  display.print(label);

  display.display();
}

void showIdle() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(14, 20);
  display.print(F("Press a button..."));
  display.setCursor(28, 36);
  display.print(F("UP / DOWN"));
  display.setCursor(24, 46);
  display.print(F("LEFT / RIGHT"));
  display.display();
}

void setup() {
  Serial.begin(9600);

  pinMode(BTN_UP,    INPUT_PULLUP);
  pinMode(BTN_DOWN,  INPUT_PULLUP);
  pinMode(BTN_LEFT,  INPUT_PULLUP);
  pinMode(BTN_RIGHT, INPUT_PULLUP);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    // Display not found — blink built-in LED as fallback
    pinMode(LED_BUILTIN, OUTPUT);
    while (true) {
      digitalWrite(LED_BUILTIN, HIGH); delay(200);
      digitalWrite(LED_BUILTIN, LOW);  delay(200);
    }
  }

  showIdle();
}

void loop() {
  if (pressed(BTN_UP,    0)) { showDirection("UP");    Serial.println(F("UP"));    }
  if (pressed(BTN_DOWN,  1)) { showDirection("DOWN");  Serial.println(F("DOWN"));  }
  if (pressed(BTN_LEFT,  2)) { showDirection("LEFT");  Serial.println(F("LEFT"));  }
  if (pressed(BTN_RIGHT, 3)) { showDirection("RIGHT"); Serial.println(F("RIGHT")); }
}
