# BotMafia 2.0 – Browser Automation & API Integration

![JavaScript](https://img.shields.io/badge/language-JavaScript%20ES6+-yellow)
![Platform](https://img.shields.io/badge/platform-Tampermonkey-green)
![Status](https://img.shields.io/badge/status-Educational%20Project-blue)

## 📌 O projekcie
BotMafia to zaawansowany skrypt typu *UserScript* (Tampermonkey/Greasemonkey) stworzony w celach edukacyjnych. Projekt służy do zgłębiania mechanik automatyzacji przeglądarkowej, inżynierii wstecznej API oraz budowania responsywnych interfejsów użytkownika wstrzykiwanych bezpośrednio do DOM (Document Object Model).

**Głównym celem projektu było stworzenie narzędzia, które komunikuje się z serwerem gry niemal wyłącznie poprzez zapytania asynchroniczne (fetch/XHR), minimalizując interakcję z warstwą wizualną.**

## 🚀 Kluczowe Funkcjonalności
* **Automatyzacja API:** Obsługa logiki gry (zbieranie surowców, treningi, walki) za pomocą bezpośrednich zapytań `POST`, `PATCH` i `DELETE` z obsługą tokenów CSRF.
* **Modułowość:** Wydzielone handlery dla różnych sekcji gry (Farm, Gym, Barracks, Crimes).
* **Zaawansowany System Licencji:** Weryfikacja dostępu oparta na skrótach kryptograficznych `HMAC-SHA256`.
* **Dynamiczny HUD (UI):** Nowoczesny, półprzezroczysty interfejs użytkownika z możliwością przesuwania (drag-and-drop) i zmiany orientacji.
* **System Powiadomień:** Autorski system "Toast Notifications" informujący o statusie wykonanych akcji.
* **Inteligentne Odświeżanie:** Algorytm sprawdzający bezczynność bota przed przeładowaniem strony, aby uniknąć przerwania krytycznych procesów.

## 🛠️ Technologie i Koncepcje
* **Asynchroniczny JavaScript:** Intensywne wykorzystanie `async/await` oraz `Promises` do zarządzania kolejnością wykonywanych zadań.
* **DOM Manipulation:** Wstrzykiwanie zaawansowanych stylów CSS (Blur, Gradients) i dynamicznych elementów sterujących.
* **Security:** Implementacja weryfikacji licencji przez zewnętrzne API (GitHub Raw) oraz bezpieczne zarządzanie danymi sesyjnymi.
* **Persistency:** Wykorzystanie `GM_setValue` i `GM_getValue` do trwałego przechowywania konfiguracji użytkownika.

## ⚙️ Instalacja i Konfiguracja
> **Uwaga:** Projekt ma charakter demonstracyjny. Aby uruchomić go w pełni:
1. Wymagane jest rozszerzenie Tampermonkey.
2. Należy uzupełnić brakujące klucze `SECRET_KEY` oraz `LOG_WEBHOOK_URL` (usunięte w celach bezpieczeństwa w wersji publicznej).
3. Skrypt jest dostosowany do pracy z plikiem `license.json` na zewnętrznym repozytorium.

## ⚠️ Disclaimer
Projekt powstał wyłącznie w celach edukacyjnych i badawczych. Autor nie zachęca do naruszania regulaminów serwisów internetowych. Używasz skryptu na własną odpowiedzialność.

---
*Created by Mikołaj Falkowski*
