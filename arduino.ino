#include <Arduino.h>
#include <ESP32Servo.h>

// ==========================================================
// --- CONFIGURACIÓN DE FUNCIONALIDADES (NUEVO) ---
// Cambia esto a 'false' si el sensor HC-SR04 no está conectado
// para deshabilitar la lógica de evasión de obstáculos.
const bool SENSOR_ULTRASONICO_CONECTADO = false;
// ==========================================================

// --- INCLUSIONES DE BLUEDROID (Standard ESP32 BLE) ---
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLECharacteristic.h>
#include <BLEUtils.h>
#include <BLE2902.h> // Descriptor estándar

// UUIDs del Servicio y la Característica para la comunicación
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// --- VARIABLES GLOBALES DEL SISTEMA ---
#define TRIG_PIN 10 // Pin Trig del HC-SR04
#define ECHO_PIN 12

Servo servo1;
int servoPin = 18;

// Bluetooth signal Store in this variable
char btSignal = 'X';
bool newSignalReceived = false;

// Variables para movimiento del servo no bloqueante
int servoTarget = 90;     // Posición objetivo del servo
int servoCurrentPos = 90; // Posición actual del servo
unsigned long lastServoUpdate = 0;
const int SERVO_DELAY = 10; // ms entre cada grado de movimiento

// NO usamos cola, solo el último comando recibido
// El frontend controla cuándo enviar comandos

// initial Speed
int Speed = 0;

// PWM Pin for Controlling the speed
int enA = 3;
int enB = 46;

// motor controlling pin
int IN1 = 19;
int IN2 = 20;
int IN3 = 14;
int IN4 = 21;

long distancia, d;
long duracion;

// Punteros y estado BLE
BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;
bool deviceConnected = false;

// --- CALLBACKS BLE ESTÁNDAR ---

class MyServerCallbacks : public BLEServerCallbacks
{
  void onConnect(BLEServer *pServer)
  {
    deviceConnected = true;
    Serial.println("--- BLE CONECTADO ---");
  };

  void onDisconnect(BLEServer *pServer)
  {
    deviceConnected = false;
    Serial.println("--- BLE DESCONECTADO. Reiniciando publicidad... ---");
    BLEDevice::startAdvertising();
  }
};

class MyCallbacks : public BLECharacteristicCallbacks
{
  void onWrite(BLECharacteristic *pCharacteristic)
  {

    // Extraer los datos crudos del paquete BLE
    std::string rxValue;
    const uint8_t *dataPtr = pCharacteristic->getData();
    size_t len = pCharacteristic->getLength();

    if (len > 0 && dataPtr)
    {
      rxValue = std::string((char *)dataPtr, len);
    }

    if (rxValue.length() > 0)
    {
      // Simplificado: solo guardar el último comando
      // Si llega uno nuevo mientras procesamos, se sobrescribe
      btSignal = rxValue[0];
      newSignalReceived = true;

      Serial.print("BLE recibido: '");
      Serial.print(btSignal);
      Serial.println("'");
    }
  }
};

// --- FUNCIONES DE HARDWARE ---

long medirDistancia()
{
  // Generar pulso de trigger
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  // Medir la duración del pulso de echo con un timeout de 20ms (NUEVO)
  // Esto evita que el código se bloquee si el sensor no responde.
  duracion = pulseIn(ECHO_PIN, HIGH, 20000);
  // Conversión a cm. Si hay timeout, duracion es 0.
  d = duracion / 58.2;
  return d;
}

void abre()
{
  // Versión NO bloqueante - solo establece el objetivo
  servoTarget = 150;
}

void cierra()
{
  // Versión NO bloqueante - solo establece el objetivo
  servoTarget = 90;
}

void backward()
{
  analogWrite(enA, Speed);
  analogWrite(enB, Speed);

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void forward()
{
  analogWrite(enA, Speed);
  analogWrite(enB, Speed);

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void left()
{
  analogWrite(enA, Speed);
  analogWrite(enB, Speed);

  // Gira sobre su eje
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void right()
{
  analogWrite(enA, Speed);
  analogWrite(enB, Speed);

  // Gira sobre su eje
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void stop()
{
  // Desactiva PWM y pines de dirección
  analogWrite(enA, 0);
  analogWrite(enB, 0);

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

// --- SETUP ---

void setup()
{
  Serial.begin(9600);

  // Inicialización de BLE
  BLEDevice::init("ADCA07");
  BLEDevice::setPower(ESP_PWR_LVL_P9);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_WRITE);
  pCharacteristic->setCallbacks(new MyCallbacks());
  pCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println("BLE Advertising Started (Pila Estándar)");

  // Configuración de pines de motor, servo y sensor
  pinMode(enA, OUTPUT);
  pinMode(enB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  servo1.attach(servoPin, 500, 2400);
  servo1.write(90);

  // Estado inicial: detenido
  stop();
}

// --- LOOP (LÓGICA SIMPLIFICADA) ---

void loop()
{
  // Actualizar servo de forma no bloqueante
  if (millis() - lastServoUpdate >= SERVO_DELAY)
  {
    lastServoUpdate = millis();

    if (servoCurrentPos < servoTarget)
    {
      servoCurrentPos++;
      servo1.write(servoCurrentPos);
    }
    else if (servoCurrentPos > servoTarget)
    {
      servoCurrentPos--;
      servo1.write(servoCurrentPos);
    }
  }

  // Procesar solo si hay un nuevo comando
  if (newSignalReceived)
  {
    newSignalReceived = false; // Marcar como procesado

    Serial.print("Procesando: ");
    Serial.println(btSignal);

    // 1. LÓGICA DE VELOCIDAD
    if (btSignal == '0')
      Speed = 110;
    else if (btSignal == '1')
      Speed = 120;
    else if (btSignal == '2')
      Speed = 130;
    else if (btSignal == '3')
      Speed = 140;
    else if (btSignal == '4')
      Speed = 150;
    else if (btSignal == '5')
      Speed = 160;
    else if (btSignal == '6')
      Speed = 170;
    else if (btSignal == '7')
      Speed = 180;
    else if (btSignal == '8')
      Speed = 190;
    else if (btSignal == '9')
      Speed = 200;

    // 2. LÓGICA DE MOVIMIENTO / PINZA

    // COMANDO W (ADELANTE): Incluye la lógica condicional del sensor.
    if (btSignal == 'W')
    {
      bool obstaculoCerca = false;

      if (SENSOR_ULTRASONICO_CONECTADO)
      {
        distancia = medirDistancia();
        // Si distancia es 0 (timeout) o <= 15cm, consideramos obstáculo
        if (distancia <= 15)
        {
          obstaculoCerca = true;
        }
      }

      if (obstaculoCerca)
      {
        Serial.println("¡OBSTÁCULO DETECTADO! Deteniendo.");
        stop();
        // NO hacemos maniobra de evasión automática (delays bloqueantes)
        // El usuario debe controlar manualmente
      }
      else
      {
        // Si no hay obstáculo (o la evasión está deshabilitada), avanzar normalmente
        forward();
      }
    }
    // Resto de comandos (no necesitan chequeo de obstáculos)
    else if (btSignal == 'S')
    {
      backward();
    }
    else if (btSignal == 'A')
    {
      left();
    }
    else if (btSignal == 'D')
    {
      right();
    }

    // Comandos de Pinza
    else if (btSignal == 'Q')
    {
      abre();
    }
    else if (btSignal == 'E')
    {
      cierra();
    }

    // Detener
    else if (btSignal == 'X')
    {
      stop();
    }
  }
}