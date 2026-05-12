# NorthStar — Class Diagrams

Two diagrams: the **companion web app** and the **physical device firmware**.

---

## 1 — Companion Web App

```mermaid
classDiagram

    %% ── Core Data ───────────────────────────────────────────────
    class Credential {
        +id: string
        +serviceName: string
        +username: string
        +password: string
        +icon: string
        +createdAt: string
    }

    class SyncState {
        +phase: idle|encrypting|sending|done|error
        +progress: number
        +statusLine: string
        +error?: string
    }

    class LastSync {
        +at: string
        +count: number
    }

    %% ── Hooks (business logic) ──────────────────────────────────
    class useVaultStorage {
        <<hook>>
        status: loading|new|locked|unlocked
        credentials: Credential[]
        unlockError: string
        ---
        createVault(password)
        unlock(password)
        saveCredentials(creds)
        lock()
        wipeVault()
    }

    class useSerialDevice {
        <<hook>>
        isSupported: boolean
        isConnected: boolean
        isPaired: boolean
        syncState: SyncState
        lastSync: LastSync
        deviceSelectedIdx: number
        ---
        connect()
        disconnect()
        syncCredentials(creds)
        resetSync()
        clearDeviceSelect()
    }

    %% ── Pages ───────────────────────────────────────────────────
    class VaultPage {
        <<page  /vault>>
        isTransferring: boolean
        isAddingNew: boolean
        editingCredential: Credential
        selectedCredential: Credential
        ---
        handleAdd()
        handleDelete()
        handleEditSave()
        handleInitiateSync()
    }

    class WelcomePage {
        <<page  />>
    }

    %% ── Layout ──────────────────────────────────────────────────
    class Dashboard {
        <<component>>
        Composes the full vault view
        ---
        TopBar
        CredentialList
        BottomActionBar
        DevicePanel
    }

    class TopBar {
        <<component>>
        Device status badge
        Lock button
        Nav links
    }

    class BottomActionBar {
        <<component>>
        INITIATE SECURE SYNC button
        + Add New button
    }

    %% ── Vault UI ────────────────────────────────────────────────
    class CredentialList {
        <<component>>
        Search filter
        Renders CredentialCard list
    }

    class CredentialCard {
        <<component>>
        serviceName / username / icon
        Edit · Delete actions
        Sync status dot
    }

    class AddCredentialModal {
        <<component>>
        Create or edit a credential
        Icon picker
    }

    %% ── Auth ────────────────────────────────────────────────────
    class UnlockScreen {
        <<component>>
        mode: new | locked
        PBKDF2 password entry
        CREATE VAULT / UNLOCK
    }

    %% ── Device UI ───────────────────────────────────────────────
    class DevicePanel {
        <<component>>
        LCD 16x2 simulator
        UP / DOWN / BACK / SELECT buttons
        EEPROM slot usage bar
        Sync status + SYNC NOW
    }

    class TransferModal {
        <<component>>
        Chunked transfer progress
        ProgressRing
        Phase: encrypting → sending → done
    }

    class PasswordReadyModal {
        <<component>>
        Shown on device SELECT event
        COPY PASSWORD button
        30-second auto-dismiss
    }

    %% ── Relationships ───────────────────────────────────────────
    useVaultStorage "1" --> "*" Credential : stores in AES-256-GCM vault
    useSerialDevice --> SyncState : tracks
    useSerialDevice --> LastSync : persists
    useSerialDevice --> Credential : syncs over USB serial

    VaultPage --> useVaultStorage : uses
    VaultPage --> useSerialDevice : uses
    VaultPage --> Dashboard : renders (when unlocked)
    VaultPage --> UnlockScreen : renders (when locked / new)
    VaultPage --> TransferModal : renders during sync
    VaultPage --> AddCredentialModal : renders add / edit
    VaultPage --> PasswordReadyModal : renders on device SELECT

    Dashboard *-- TopBar
    Dashboard *-- CredentialList
    Dashboard *-- BottomActionBar
    Dashboard *-- DevicePanel

    CredentialList *-- CredentialCard
    TransferModal --> SyncState
```

---

## 2 — Physical Device Firmware (`northstar_hid.ino`)

Board: **Arduino Leonardo — ATmega32U4**

```mermaid
classDiagram

    %% ── State machine ───────────────────────────────────────────
    class MenuState {
        <<enumeration>>
        S_PAIRING
        S_HOME
        S_ACCOUNTS
        S_ACCOUNT_DETAIL
        S_ACCOUNTS_REMOVE_CONFIRM
        S_SETTINGS
        S_INFO
        S_USER
        S_DELETE_ALL_CONFIRM
        S_RECEIVING
        S_SYNC_DONE
    }

    %% ── Main firmware ───────────────────────────────────────────
    class NorthStarHID {
        <<Arduino sketch>>
        currentState: MenuState
        cursor: int
        entryCount: int
        entryNames[20][16]: char
        entryPwds[20][33]: char
        ---
        setup()
        loop()
        updateDisplay()
        selectOption()
        moveCursor(dir)
        goBack()
    }

    %% ── Subsystems ──────────────────────────────────────────────
    class EEPROMStore {
        <<1 KB storage>>
        magic[2]: 0xAB 0xCD
        count[1]: byte
        entries[20 x 50B]
        ---
        loadEntries()
        saveEntry(idx, name, pwd)
        clearEntries()
        hasValidData()
    }

    class SerialProtocol {
        <<9600 baud JSON>>
        inputBuffer: String
        payloadBuffer: String
        receiving: boolean
        expectedLen: int
        ---
        processLine(line)
        processCommand(cmd)
        extractAndStore()
        sendPair()
        sendAck()
    }

    class ButtonHandler {
        <<INPUT_PULLUP>>
        BTN_UP    = pin 6
        BTN_DOWN  = pin 7
        BTN_BACK  = pin 8
        BTN_SELECT = pin 9
        debounce: 200 ms
        ---
        btnPressed(pin, idx)
    }

    class LCDDisplay {
        <<LCD 16x2 parallel>>
        RS=12  E=11
        D4=5 D5=4 D6=3 D7=2
        ---
        lcdRow(row, text)
        lcdHeader(title, back, fwd)
        lcdItem(item, selected)
    }

    class USBKeyboard {
        <<USB HID — no drivers>>
        Keyboard.print(pwd)
        Keyboard.releaseAll()
        3-second countdown
        then types password
    }

    %% ── Relationships ───────────────────────────────────────────
    NorthStarHID --> MenuState : state machine
    NorthStarHID --> EEPROMStore : load / save credentials
    NorthStarHID --> SerialProtocol : receive sync from app
    NorthStarHID --> ButtonHandler : UP / DOWN / BACK / SELECT
    NorthStarHID --> LCDDisplay : render current screen
    NorthStarHID --> USBKeyboard : type password on SELECT

    SerialProtocol --> EEPROMStore : writes after END cmd
```

---

## How the two systems connect

```
Companion App (browser)          NorthStar Device (Leonardo)
────────────────────────         ──────────────────────────────
useSerialDevice hook       USB   SerialProtocol subsystem
  Web Serial API        ◄─────►  9600 baud JSON lines
  chunked 48-byte send            ACK each chunk
  syncCredentials()               extractAndStore() → EEPROM

                                 Standalone (no app needed):
                                  ButtonHandler → USBKeyboard
                                  plug into any PC, type pwd
```

| Sync command | Direction | Meaning |
|---|---|---|
| `{"event":"PAIR"}` | Device → App | Ready / announce |
| `{"cmd":"PAIR_ACK"}` | App → Device | Acknowledged |
| `{"cmd":"BEGIN","len":N}` | App → Device | Start transfer |
| `<48-byte chunk>` | App → Device | Payload chunk |
| `{"ack":1}` | Device → App | Chunk received |
| `{"cmd":"END"}` | App → Device | Write to EEPROM |
| `{"event":"SELECT","idx":N}` | Device → App | User picked account |
