/*
 * LCD1602 Basic Test
 *
 * Tries both common I2C addresses (0x27 and 0x3F) and prints
 * which one worked to the Serial Monitor (9600 baud).
 *
 * If NEITHER address shows text on the display:
 *   - Check SDA -> A4, SCL -> A5, VCC -> 5V, GND -> GND
 *   - Turn the small blue potentiometer on the back of the I2C adapter
 *
 * Library needed: "LiquidCrystal I2C" by Frank de Brabander
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
bool found = false;

void tryAddress(uint8_t addr) {
  Wire.beginTransmission(addr);
  if (Wire.endTransmission() == 0) {
    Serial.print("Found LCD at 0x");
    Serial.println(addr, HEX);
    lcd = LiquidCrystal_I2C(addr, 16, 2);
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("NSA Device v1.0 ");
    lcd.setCursor(0, 1);
    lcd.print("LCD OK! 0x");
    lcd.print(addr, HEX);
    lcd.print("      ");
    found = true;
  }
}

void setup() {
  Serial.begin(9600);
  Wire.begin();
  delay(500);

  Serial.println("Scanning I2C for LCD...");
  tryAddress(0x27);
  tryAddress(0x3F);

  if (!found) {
    Serial.println("No LCD found at 0x27 or 0x3F.");
    Serial.println("Check: SDA->A4, SCL->A5, VCC->5V, GND->GND");
    Serial.println("Also try turning the contrast pot on the I2C backpack.");
  }
}

void loop() {}
