# Retro Putt: Editor Persistence Architecture & UI Requirements

## 1. Architecture Plan: The Manifest System

### 1.1 Data Structure
To prevent data loss and ensure fast loading times, we decouple the **Level Metadata** (The List) from the **Level Data** (The Grid).

**A. The Manifest (Metadata)**
* **Storage Key**: `rp_editor_manifest`
* **Format**: JSON Array of Objects
* **Content**:
    ```json
    [
      {
        "id": "1733512345899",         // Immutable UUID (Timestamp based)
        "name": "Sunny Slopes",        // Mutable Display Name
        "lastModified": 1733512345899, // Unix Timestamp
        "preview": "WALL,SAND..."      // (Optional) Tiny string for mini-grid
      }
    ]
    ```

**B. The Data Blobs (Level Content)**
* **Storage Key**: `rp_level_{UUID}` (e.g., `rp_level_1733512345899`)
* **Format**: Base64 Encoded JSON String (The standard "Share Code")
* **Content**: `RP1:eyJ...`

### 1.2 The "Dirty" Flag (State Safety)
* **Property**: `EditorSystem.isDirty` (Boolean)
* **Default**: `false`
* **Triggers to TRUE**:
    * `PAINT` action (Wall, Sand, Water)
    * `PLACE` action (Start, Hole, Slope, Entity)
    * `ERASE` action
* **Triggers to FALSE**:
    * Successful `saveLevel()` execution.
    * Fresh `newLevel()` initialization.
    * Successful `loadLevel()` execution.
* **Logic Gate**:
    * IF `isDirty === true` AND User attempts `EXIT`, `LOAD`, or `NEW`:
    * **BLOCK ACTION** -> Show "Unsaved Changes" Modal.

---

## 2. UI Requirements

### 2.1 General Design Constraints
* **Mobile-First**: Touch targets must be at least 44x44px.
* **No Native Alerts**: Do NOT use `window.alert`, `window.confirm`, or `window.prompt`. Use HTML overlays.
* **Z-Index**: Modals must sit at `z-index: 50` (Above the HUD `z-index: 20`).

### 2.2 Save Course Modal
* **Trigger**: Clicking "Save" icon in Editor Toolbar.
* **Layout**:
    * **Header**: "Save Course"
    * **Input Field**:
        * Type: `text`
        * Max Length: `24 chars`
        * Placeholder: "Course Name..."
        * *Auto-fill*: If updating an existing level, pre-fill current name.
    * **Buttons**:
        * [Cancel]: Closes modal.
        * [Save]: Commits data, updates Manifest, clears `isDirty`.

### 2.3 Load Course Modal
* **Trigger**: Clicking "Load" icon in Editor Toolbar.
* **Layout**:
    * **Header**: "My Courses"
    * **Container**: Scrollable `<ul>` list (Height: 60% of screen).
    * **List Item Template**:
        ```html
        <li class="save-slot" data-id="{UUID}">
            <div class="slot-info">
                <span class="slot-name">{Name}</span>
                <span class="slot-date">{MM/DD HH:MM}</span>
            </div>
            <button class="btn-delete" aria-label="Delete">🗑️</button>
        </li>
        ```
    * **Interactions**:
        * **Tap Body**: Loads the level immediately.
        * **Tap Trash**: Shows "Confirm Delete" sub-modal.

### 2.4 "Unsaved Changes" Confirmation
* **Trigger**: Navigation away while `isDirty === true`.
* **Message**: "You have unsaved changes. Save before leaving?"
* **Buttons**:
    * [Discard]: Proceed with action (Data is lost).
    * [Save]: Open Save Modal.
    * [Cancel]: Return to Editor.