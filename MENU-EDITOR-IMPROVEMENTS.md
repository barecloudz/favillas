# Menu Editor - Choice Groups Management Improvements

## Current State
- Drag-and-drop exists for adding choice groups to menu items
- No visual indication of what's already assigned
- Hard to see which groups are required vs optional
- Can't reorder choice groups on a menu item
- Current assignments (like Wing Flavors, Traditional Pizza Size) are invisible

## Required Improvements

### 1. Visual Display of Assigned Choice Groups
Each menu item card should show:
- **Badge list** of assigned choice groups
- **Required indicator** (red star or badge color)
- **Order number** for each group
- **Quick actions**: Remove, Toggle Required, Reorder

### 2. Enhanced Drag-and-Drop
- Maintain existing functionality
- Add visual feedback when dragging over a menu item
- Show confirmation before removing critical groups (like sizes)
- Prevent duplicate assignments

### 3. Choice Group Assignment Panel
For each menu item, add an expandable section with:
- List of all assigned choice groups (sorted by order)
- Toggle required/optional
- Reorder via drag handles
- Quick add from available groups
- Remove with confirmation

### 4. Backend Data Integration
- Fetch `/api/menu-item-choice-groups` on load
- Map assignments to menu items
- Update on drag-drop, toggle, reorder
- Persist changes immediately

### 5. Visual Design
- Use colored badges:
  - **Red** = Required primary (sizes, flavors)
  - **Blue** = Required secondary (must-select toppings)
  - **Gray** = Optional
- Show order numbers (1, 2, 3...)
- Add icons for actions (trash, toggle, drag handle)

## Implementation Plan

### Phase 1: Data Layer
1. ✅ Add PUT endpoint to API
2. Add React Query hooks for menu_item_choice_groups
3. Create state management for assignments
4. Map data to menu items

### Phase 2: UI Components
1. Create `MenuItemChoiceGroupBadge` component
2. Create `ChoiceGroupAssignmentPanel` component
3. Add to menu item cards
4. Style with Tailwind

### Phase 3: Drag-and-Drop Enhancement
1. Improve drop zone highlighting
2. Add confirmation dialogs
3. Handle duplicate prevention
4. Update backend on drop

### Phase 4: Actions & Controls
1. Add required/optional toggle
2. Add reorder drag handles
3. Add remove button with confirmation
4. Add quick-add dropdown

### Phase 5: Testing
1. Test with existing assignments (Wing Flavors, etc.)
2. Test drag-and-drop workflow
3. Test reordering
4. Test required toggle
5. Verify no data loss

## Example UI Design

```
┌─────────────────────────────────────────┐
│ 🍕 Large Pepperoni Pizza        $16.99 │
│ ─────────────────────────────────────── │
│ Specialty Gourmet Pizzas                │
│                                         │
│ Choice Groups:                          │
│ [1 🔴 Specialty Gourmet Pizza Size] ⚙️  │
│ [2 🔵 Toppings (10")] ⚙️               │
│ [3 ⚪ Extra Cheese] ⚙️                  │
│                                         │
│ [+ Add Choice Group ▼]                  │
│                                         │
│ [Edit] [Duplicate] [Delete]             │
└─────────────────────────────────────────┘
```

## Success Criteria
- ✅ All existing assignments visible
- ✅ Can drag new groups onto items
- ✅ Can toggle required/optional
- ✅ Can reorder groups
- ✅ Can remove groups safely
- ✅ Changes persist immediately
- ✅ No loss of existing data
- ✅ Intuitive UI for non-technical users
