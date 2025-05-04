# CodeVibeAI Architecture Diagram

```
+-----------------------------------------------------+
|                  CodeVibeAI System                  |
+-----------------------------------------------------+

+-----------------------------------------------------+
|                  Extension System                   |
|                                                     |
|  +---------------+  +---------------+  +---------+  |
|  | AI Provider   |  | Context       |  | Custom  |  |
|  | Extensions    |  | Extensions    |  | UI Exts |  |
|  +---------------+  +---------------+  +---------+  |
+-----^-----------------^-----------------^-----------+
      |                 |                 |
      |                 |                 |            Extension API
======|=================|=================|===========
      |                 |                 |
+-----v-----------------v-----------------v-----------+
|                      UI Layer                       |
|                                                     |
|  +---------------+  +---------------+  +---------+  |
|  | Code Editor   |  | Chat          |  | AI      |  |
|  | Enhancements  |  | Interface     |  | Actions |  |
|  +---------------+  +---------------+  +---------+  |
+-----^-----------------^-----------------^-----------+
      |                 |                 |
      |                 |                 |            UI Service API
======|=================|=================|===========
      |                 |                 |
+-----v-----------------v-----------------v-----------+
|                Integration Layer                    |
|                                                     |
|  +---------------+  +---------------+               |
|  | Claude API    |  | Context7      |               |
|  | Integration   |  | Integration   |               |
|  +-------^-------+  +-------^-------+               |
+---------|------------------|---------------------------+
          |                  |
          |                  |                      External API
==========|==================|===========================
          |                  |
+---------v------------------v-----------------------+
|              External AI Services                  |
|                                                    |
|  +---------------+       +---------------+         |
|  | Claude        |       | Context7      |         |
|  | API           |       | API           |         |
|  +---------------+       +---------------+         |
+----------------------------------------------------+
          ^                  ^
          |                  |
+---------|------------------|---------------------------+
|         v                  v                           |
|                CodeVibeAI Core                         |
|                                                        |
|  +----------------+  +----------------+  +---------+   |
|  | AI Service     |  | Context        |  | Config  |   |
|  | Interface      |  | Service        |  | Service |   |
|  +----------------+  +----------------+  +---------+   |
|                                                        |
|  +----------------+  +----------------+  +---------+   |
|  | Event Bus      |  | Extension      |  | Logger  |   |
|  |                |  | Registry       |  |         |   |
|  +----------------+  +----------------+  +---------+   |
+---------------------------^---------------------------+
                            |
                            |                     Theia API
============================|=============================
                            |
+---------------------------v---------------------------+
|                     Theia Core                        |
|                                                       |
|  +---------------+  +---------------+  +---------+    |
|  | Editor        |  | Workspace     |  | UI      |    |
|  | Framework     |  | Management    |  | Toolkit |    |
|  +---------------+  +---------------+  +---------+    |
|                                                       |
|  +---------------+  +---------------+  +---------+    |
|  | File System   |  | Terminal      |  | Debug   |    |
|  | Access        |  | Interface     |  | Support |    |
|  +---------------+  +---------------+  +---------+    |
+-------------------------------------------------------+

              Data Flow
+-------------------------------------------------------+
|                                                       |
| 1. User interacts with CodeVibeAI UI                  |
|                       |                               |
|                       v                               |
| 2. Context7 extracts code context                     |
|                       |                               |
|                       v                               |
| 3. Context + user request sent to Claude              |
|                       |                               |
|                       v                               |
| 4. Claude generates AI response                       |
|                       |                               |
|                       v                               |
| 5. Response processed and displayed in UI             |
|                                                       |
+-------------------------------------------------------+
```

## Key API Boundaries

1. **Extension API**
   - Allows third-party extensions to integrate with CodeVibeAI
   - Provides access to AI and context services
   - Enables UI extension and custom commands

2. **UI Service API**
   - Connects UI components to backend services
   - Handles presentation and interaction logic
   - Manages UI state and updates

3. **External API**
   - Secure communication with Claude and Context7
   - Authentication and request formatting
   - Response parsing and error handling

4. **Theia API**
   - Leverages Theia's extension mechanism
   - Integrates with Theia's UI framework
   - Utilizes Theia's IDE capabilities