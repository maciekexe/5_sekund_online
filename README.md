# ⏱️ 5 Sekund - Multiplayer Web Game

Internetowa, wieloosobowa wersja popularnej gry imprezowej "5 Sekund". Gra pozwala na tworzenie prywatnych pokoi, wspólną zabawę ze znajomymi w czasie rzeczywistym i rywalizację na wirtualnej planszy. 

## 📖 O projekcie
Celem projektu było przeniesienie dynamiki gry imprezowej do przeglądarki, z zachowaniem pełnej synchronizacji między graczami. Gracz ma dokładnie 5 sekund na wymienienie 3 rzeczy z wylosowanej kategorii. Pytania są **dynamicznie generowane przez sztuczną inteligencję**, a weryfikacja odpowiedzi odbywa się poprzez demokratyczne głosowanie pozostałych graczy.

## ✨ Główne funkcje
* **System Pokoi (Rooms):** Tworzenie prywatnych instancji gry chronionych 4-cyfrowym kodem PIN.
* **Czas Rzeczywisty:** Natychmiastowa synchronizacja stanu gry, pionków na planszy i tykającego zegara za pomocą WebSockets.
* **Integracja AI:** Pytania nie są wpisane na sztywno – generuje je na żywo model LLaMA 3 (Groq API) na podstawie wybranej przez Hosta kategorii.
* **System Głosowania:** Kiedy czas mija, reszta graczy głosuje (Zaliczone / Skucha), decydując o ruchu pionka.
* **Odporność na utratę sesji:** Przypadkowe odświeżenie strony na telefonie nie wyrzuca z gry – gracz płynnie wraca na swoje miejsce dzięki identyfikacji `sessionId`.
* **Zarządzanie przez Hosta:** Host posiada uprawnienia do wyrzucania nieaktywnych graczy, pomijania pytań i resetowania gry.

## 🛠️ Technologie (Tech Stack)
* **Frontend:** React.js (Vite), CSS3 (Moduły, Grid/Flexbox)
* **Backend:** Node.js, Express.js
* **Komunikacja Real-Time:** Socket.io
* **Sztuczna Inteligencja:** Groq API (LLaMA 3 70B)
* **Hosting:** Vercel (Frontend) & Render (Backend)

## 🧠 Największe wyzwania techniczne 
Podczas budowy tego projektu zmierzyłem się z kilkoma zaawansowanymi problemami architektury asynchronicznej:
1. **Race Conditions przy timerach:** Rozwiązanie problemu nakładających się na siebie zdarzeń (np. Host klika "Pomiń Pytanie", podczas gdy stary timer dąży do zera, a API dopiero generuje nowe pytanie). Wymagało to rygorystycznego czyszczenia interwałów (`clearInterval`) przed emisją nowych stanów.
2. **Utrata połączenia (Host Migration):** Zbudowanie mechanizmu, który nie psuje gry, gdy Host rozłączy się z serwerem. Uprawnienia ("korona") są automatycznie i płynnie przekazywane następnemu graczowi w tablicy.
3. **Izolacja Stanu Pokojów:** Bezpieczne przechowywanie stanu wielu równoległych gier w pamięci serwera (`Map()`), tak aby zdarzenia z pokoju A nie miały wpływu na pokój B.



