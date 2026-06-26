# 🌿 SK Health Tracker & Cardio Engineering Hub

An ultra-modern, high-fidelity, client-side fitness and tactical telemetry companion built entirely from scratch. This dashboard eliminates costly tracking dependencies, cloud wall blockades, and subscription fees by keeping data completely localized, private, and lightning fast.

---

## ⚡ Key Highlights
* **🛰️ Zero-Paywall GPS Tracking:** Powered by Leaflet.js and OpenStreetMap. Fully independent real-world route line tracking without corporate billing keys.
* **🧠 Metaphoric Biological Engine:** Formulated with the standard **Mifflin-St Jeor Equation** to calculate baseline BMR, alongside adaptive non-linear macros parsing.
* **📋 Frictionless Nutrition Portals:** Decoupled daily body weight logs from meal updates. Track Calories, Carbs, Protein, and Fats repeatedly throughout the day without typing your weight every single time.
* **🔒 Total Data Autonomy:** No sign-ins, no tracking software, no remote servers. Runs entirely on the device via serialized `localStorage` JSON streams.

---

## 🛠️ The Architectural Evolution

### Phase 1: Native Inputs & Linear Views
The project started as a standard HTML layout. App navigation states map to custom active class list structures (`.hidden-page` vs `.active-page`), entirely avoiding page reload artifacts.

### Phase 2: Overcoming Selection Breaks
To capture complex workout routines, we engineered custom dropdown components. When standard properties threw errors on `<div>` nodes, the extraction engine was re-written using strict query arrays:
```javascript
const checkedCheckboxes = container.querySelectorAll('input[type="checkbox"]:checked');
const values = Array.from(checkedCheckboxes).map(cb => cb.value);
