// I2C Scanner — prints all found I2C device addresses to Serial Monitor
// Open Serial Monitor at 9600 baud after uploading

#include <Wire.h>

void setup() {
  Serial.begin(9600);
  Wire.begin();
  delay(1000);
  Serial.println("=== I2C Scanner ===");
  Serial.println("Scanning...");

  int found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte err = Wire.endTransmission();
    if (err == 0) {
      Serial.print("Device found at 0x");
      if (addr < 16) Serial.print("0");
      Serial.print(addr, HEX);
      if (addr == 0x3C || addr == 0x3D) Serial.print("  <-- OLED display");
      Serial.println();
      found++;
    }
  }

  if (found == 0) Serial.println("No I2C devices found. Check SDA=A4, SCL=A5 wiring.");
  else { Serial.print(found); Serial.println(" device(s) found."); }
}

void loop() {}
