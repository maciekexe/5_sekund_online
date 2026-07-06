# ⏱️ 5 Sekund - Multiplayer Web Game

Internetowa, wieloosobowa wersja popularnej gry imprezowej "5 Sekund". Gra pozwala na tworzenie prywatnych pokoi, wspólną zabawę ze znajomymi w czasie rzeczywistym i rywalizację na wirtualnej planszy. 

## 📖 O projekcie
Celem projektu było przeniesienie dynamiki gry imprezowej do przeglądarki, z zachowaniem pełnej synchronizacji między graczami. Gracz ma dokładnie 5 sekund na wymienienie 3 rzeczy z wylosowanej kategorii. Pytania są **dynamicznie generowane przez sztuczną inteligencję**, a weryfikacja odpowiedzi odbywa się poprzez demokratyczne głosowanie pozostałych graczy.

## ✨ Główne funkcje
* **System Pokoi (Rooms):** Tworzenie prywatnych instancji gry chronionych 4-cyfrowym kodem PIN.
* **Czas Rzeczywisty:** Natychmiastowa synchronizacja stanu gry, pionków na planszy i tykającego zegara za pomocą WebSockets.
* **Integracja AI (z zabezpieczeniem):** Pytania generuje na żywo model LLaMA 3 (Groq API). Jeśli AI zawiedzie, system bezpiecznie wylosuje jedno z wielu wbudowanych pytań awaryjnych.
* **System Głosowania:** Kiedy czas mija, reszta graczy głosuje (Zaliczone / Skucha). Przejrzysty interfejs na bieżąco pokazuje status głosowania każdego gracza (⏳ / ✅).
* **Odporność na utratę sesji:** Przypadkowe odświeżenie strony nie wyrzuca z gry – gracz płynnie wraca na swoje miejsce dzięki identyfikacji `sessionId`.
* **Zarządzanie przez Hosta:** Host posiada uprawnienia do wyrzucania graczy i pomijania pytań. Eventy serwerowe są silnie zabezpieczone sprzętową weryfikacją (tylko Host może wykonać te akcje).
* **Bezpieczeństwo i Optymalizacja:** Rygorystyczna walidacja danych gracza na backendzie za pomocą Zod oraz czyszczenie z pamięci pustych pokoi (Memory Leak protection).

## 🛠️ Technologie (Tech Stack)
* **Frontend:** React.js (Vite), CSS3 (Moduły, Grid/Flexbox), Framer Motion (płynne animacje)
* **Backend:** Node.js, Express.js, Zod (walidacja)
* **Komunikacja Real-Time:** Socket.io
* **Sztuczna Inteligencja:** Groq API (LLaMA 3 70B)
* **Testowanie i CI/CD:** Vitest, GitHub Actions (automatyczne pipleline'y testowe po każdym Pull Request'cie)
* **UI/UX:** DiceBear API (generowanie uroczych awatarów), react-hot-toast (nowoczesne powiadomienia)

## 🧠 Największe wyzwania techniczne 
Podczas budowy tego projektu zmierzyłem się z kilkoma zaawansowanymi problemami:
1. **Race Conditions przy timerach:** Rozwiązanie problemu nakładających się na siebie zdarzeń (np. Host klika "Pomiń Pytanie", podczas gdy stary timer dąży do zera). Wymagało to rygorystycznego czyszczenia interwałów przed emisją nowych stanów.
2. **Utrata połączenia (Host Migration):** Zbudowanie mechanizmu, który nie psuje gry, gdy Host rozłączy się z serwerem. Uprawnienia są automatycznie przekazywane następnemu graczowi.
3. **Izolacja Stanu Pokojów i Bezpieczeństwo:** Bezpieczne przechowywanie stanu gier w pamięci serwera, połączone z twardym autoryzowaniem socketów, by uchronić pokoje przed złośliwymi eventami "z zewnątrz".
4. **Płynność Interfejsu (Framer Motion):** Zastąpienie przeskakujących na kafelkach pionków płynnymi animacjami Layout Transition, dającymi naturalne wrażenie przesuwania piona po planszy fizycznej.
