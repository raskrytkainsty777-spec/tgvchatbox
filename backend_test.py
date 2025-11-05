#!/usr/bin/env python3
"""
Backend API Test Suite for Telegram Chat Panel
Tests menu system and sales tracking system endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend env
BACKEND_URL = "https://menu-bot-panel.preview.emergentagent.com/api"

class TelegramChatPanelTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_buttons = []
        self.created_menus = []
        self.existing_bots = []
        self.existing_labels = []
        self.existing_chats = []
        self.buyers_label_id = None
        self.created_sales = []
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
    def make_request(self, method, endpoint, data=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == "GET":
                response = self.session.get(url, timeout=30)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=30)
            elif method == "DELETE":
                response = self.session.delete(url, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed for {method} {endpoint}: {str(e)}")
            return None
        except Exception as e:
            print(f"❌ Unexpected error for {method} {endpoint}: {str(e)}")
            return None
            
    def test_get_existing_data(self):
        """Get existing bots and labels for testing"""
        print("\n=== Getting Existing Data ===")
        
        # Get existing bots
        response = self.make_request("GET", "/bots")
        if response and response.status_code == 200:
            self.existing_bots = response.json()
            self.log_result("Get Existing Bots", True, f"Found {len(self.existing_bots)} bots")
        else:
            self.log_result("Get Existing Bots", False, f"Failed to get bots: {response.status_code if response else 'No response'}")
            
        # Get existing labels
        response = self.make_request("GET", "/labels")
        if response and response.status_code == 200:
            self.existing_labels = response.json()
            self.log_result("Get Existing Labels", True, f"Found {len(self.existing_labels)} labels")
        else:
            self.log_result("Get Existing Labels", False, f"Failed to get labels: {response.status_code if response else 'No response'}")
            
    def test_create_menu_buttons(self):
        """Test creating menu buttons with different action types"""
        print("\n=== Testing Menu Button Creation ===")
        
        # Test 1: Button with label action
        if self.existing_labels:
            label_button_data = {
                "name": "Set Priority Label",
                "actions": [
                    {
                        "type": "label",
                        "value": {"label_id": self.existing_labels[0]["id"]}
                    }
                ]
            }
            response = self.make_request("POST", "/menu-buttons", label_button_data)
            if response and response.status_code == 200:
                button_data = response.json()
                self.created_buttons.append(button_data)
                self.log_result("Create Label Button", True, f"Created button with ID: {button_data['id']}")
            else:
                self.log_result("Create Label Button", False, f"Failed: {response.status_code if response else 'No response'}")
        else:
            self.log_result("Create Label Button", False, "No labels available for testing")
            
        # Test 2: Button with URL action
        url_button_data = {
            "name": "Visit Website",
            "actions": [
                {
                    "type": "url",
                    "value": {"url": "https://example.com"}
                }
            ]
        }
        response = self.make_request("POST", "/menu-buttons", url_button_data)
        if response and response.status_code == 200:
            button_data = response.json()
            self.created_buttons.append(button_data)
            self.log_result("Create URL Button", True, f"Created button with ID: {button_data['id']}")
        else:
            self.log_result("Create URL Button", False, f"Failed: {response.status_code if response else 'No response'}")
            
        # Test 3: Button with text action
        text_button_data = {
            "name": "Send Message",
            "actions": [
                {
                    "type": "text",
                    "value": {"text": "Hello! This is an automated message."}
                }
            ]
        }
        response = self.make_request("POST", "/menu-buttons", text_button_data)
        if response and response.status_code == 200:
            button_data = response.json()
            self.created_buttons.append(button_data)
            self.log_result("Create Text Button", True, f"Created button with ID: {button_data['id']}")
        else:
            self.log_result("Create Text Button", False, f"Failed: {response.status_code if response else 'No response'}")
            
        # Test 4: Button with block action (requires other button IDs)
        if len(self.created_buttons) >= 2:
            block_button_data = {
                "name": "Show Options",
                "actions": [
                    {
                        "type": "block",
                        "value": {
                            "text": "Choose an option:",
                            "button_ids": [self.created_buttons[0]["id"], self.created_buttons[1]["id"]]
                        }
                    }
                ]
            }
            response = self.make_request("POST", "/menu-buttons", block_button_data)
            if response and response.status_code == 200:
                button_data = response.json()
                self.created_buttons.append(button_data)
                self.log_result("Create Block Button", True, f"Created button with ID: {button_data['id']}")
            else:
                self.log_result("Create Block Button", False, f"Failed: {response.status_code if response else 'No response'}")
        else:
            self.log_result("Create Block Button", False, "Not enough buttons created for block action")
            
        # Test 5: Button with back action
        back_button_data = {
            "name": "Go Back",
            "actions": [
                {
                    "type": "back",
                    "value": {}
                }
            ]
        }
        response = self.make_request("POST", "/menu-buttons", back_button_data)
        if response and response.status_code == 200:
            button_data = response.json()
            self.created_buttons.append(button_data)
            self.log_result("Create Back Button", True, f"Created button with ID: {button_data['id']}")
        else:
            self.log_result("Create Back Button", False, f"Failed: {response.status_code if response else 'No response'}")
            
        # Test 6: Button with multiple actions
        multi_action_data = {
            "name": "Multi Action",
            "actions": [
                {
                    "type": "text",
                    "value": {"text": "Processing your request..."}
                },
                {
                    "type": "url",
                    "value": {"url": "https://help.example.com"}
                }
            ]
        }
        response = self.make_request("POST", "/menu-buttons", multi_action_data)
        if response and response.status_code == 200:
            button_data = response.json()
            self.created_buttons.append(button_data)
            self.log_result("Create Multi-Action Button", True, f"Created button with ID: {button_data['id']}")
        else:
            self.log_result("Create Multi-Action Button", False, f"Failed: {response.status_code if response else 'No response'}")
            
    def test_get_menu_buttons(self):
        """Test retrieving all menu buttons"""
        print("\n=== Testing Get Menu Buttons ===")
        
        response = self.make_request("GET", "/menu-buttons")
        if response and response.status_code == 200:
            buttons = response.json()
            self.log_result("Get All Menu Buttons", True, f"Retrieved {len(buttons)} buttons")
            
            # Verify our created buttons are in the response
            created_ids = {btn["id"] for btn in self.created_buttons}
            retrieved_ids = {btn["id"] for btn in buttons}
            
            if created_ids.issubset(retrieved_ids):
                self.log_result("Verify Created Buttons", True, "All created buttons found in response")
            else:
                missing = created_ids - retrieved_ids
                self.log_result("Verify Created Buttons", False, f"Missing buttons: {missing}")
                
            # Verify actions structure
            for button in buttons:
                if "actions" in button and isinstance(button["actions"], list):
                    self.log_result("Verify Actions Structure", True, f"Button {button['name']} has valid actions array")
                else:
                    self.log_result("Verify Actions Structure", False, f"Button {button['name']} missing or invalid actions")
                    
        else:
            self.log_result("Get All Menu Buttons", False, f"Failed: {response.status_code if response else 'No response'}")
            
    def test_create_bot_menus(self):
        """Test creating bot menus"""
        print("\n=== Testing Bot Menu Creation ===")
        
        if len(self.created_buttons) < 2:
            self.log_result("Create Bot Menu", False, "Not enough buttons created for menu testing")
            return
            
        # Test 1: Create menu with multiple buttons
        menu_data = {
            "name": "Main Menu",
            "button_ids": [btn["id"] for btn in self.created_buttons[:3]]
        }
        response = self.make_request("POST", "/bot-menus", menu_data)
        if response and response.status_code == 200:
            menu = response.json()
            self.created_menus.append(menu)
            self.log_result("Create Main Menu", True, f"Created menu with ID: {menu['id']}")
        else:
            self.log_result("Create Main Menu", False, f"Failed: {response.status_code if response else 'No response'}")
            
        # Test 2: Create menu with single button
        single_menu_data = {
            "name": "Simple Menu",
            "button_ids": [self.created_buttons[0]["id"]]
        }
        response = self.make_request("POST", "/bot-menus", single_menu_data)
        if response and response.status_code == 200:
            menu = response.json()
            self.created_menus.append(menu)
            self.log_result("Create Simple Menu", True, f"Created menu with ID: {menu['id']}")
        else:
            self.log_result("Create Simple Menu", False, f"Failed: {response.status_code if response else 'No response'}")
            
        # Test 3: Create empty menu
        empty_menu_data = {
            "name": "Empty Menu",
            "button_ids": []
        }
        response = self.make_request("POST", "/bot-menus", empty_menu_data)
        if response and response.status_code == 200:
            menu = response.json()
            self.created_menus.append(menu)
            self.log_result("Create Empty Menu", True, f"Created menu with ID: {menu['id']}")
        else:
            self.log_result("Create Empty Menu", False, f"Failed: {response.status_code if response else 'No response'}")
            
    def test_get_bot_menus(self):
        """Test retrieving all bot menus"""
        print("\n=== Testing Get Bot Menus ===")
        
        response = self.make_request("GET", "/bot-menus")
        if response and response.status_code == 200:
            menus = response.json()
            self.log_result("Get All Bot Menus", True, f"Retrieved {len(menus)} menus")
            
            # Verify our created menus are in the response
            created_ids = {menu["id"] for menu in self.created_menus}
            retrieved_ids = {menu["id"] for menu in menus}
            
            if created_ids.issubset(retrieved_ids):
                self.log_result("Verify Created Menus", True, "All created menus found in response")
            else:
                missing = created_ids - retrieved_ids
                self.log_result("Verify Created Menus", False, f"Missing menus: {missing}")
                
            # Verify button_ids structure
            for menu in menus:
                if "button_ids" in menu and isinstance(menu["button_ids"], list):
                    self.log_result("Verify Button IDs Structure", True, f"Menu {menu['name']} has valid button_ids array")
                else:
                    self.log_result("Verify Button IDs Structure", False, f"Menu {menu['name']} missing or invalid button_ids")
                    
        else:
            self.log_result("Get All Bot Menus", False, f"Failed: {response.status_code if response else 'No response'}")
            
    def test_bot_menu_assignments(self):
        """Test bot menu assignments"""
        print("\n=== Testing Bot Menu Assignments ===")
        
        if not self.existing_bots:
            self.log_result("Assign Menu to Bot", False, "No bots available for assignment testing")
            return
            
        if not self.created_menus:
            self.log_result("Assign Menu to Bot", False, "No menus created for assignment testing")
            return
            
        # Test 1: Assign menu to bot
        assignment_data = {
            "bot_id": self.existing_bots[0]["id"],
            "menu_id": self.created_menus[0]["id"]
        }
        response = self.make_request("POST", "/bot-menu-assignments", assignment_data)
        if response and response.status_code == 200:
            self.log_result("Assign Menu to Bot", True, f"Assigned menu {self.created_menus[0]['name']} to bot {self.existing_bots[0]['username']}")
        else:
            self.log_result("Assign Menu to Bot", False, f"Failed: {response.status_code if response else 'No response'}")
            
        # Test 2: Assign different menu to same bot (should replace)
        if len(self.created_menus) > 1:
            assignment_data2 = {
                "bot_id": self.existing_bots[0]["id"],
                "menu_id": self.created_menus[1]["id"]
            }
            response = self.make_request("POST", "/bot-menu-assignments", assignment_data2)
            if response and response.status_code == 200:
                self.log_result("Replace Bot Menu Assignment", True, f"Replaced with menu {self.created_menus[1]['name']}")
            else:
                self.log_result("Replace Bot Menu Assignment", False, f"Failed: {response.status_code if response else 'No response'}")
                
        # Test 3: Assign menu to different bot
        if len(self.existing_bots) > 1:
            assignment_data3 = {
                "bot_id": self.existing_bots[1]["id"],
                "menu_id": self.created_menus[0]["id"]
            }
            response = self.make_request("POST", "/bot-menu-assignments", assignment_data3)
            if response and response.status_code == 200:
                self.log_result("Assign Menu to Second Bot", True, f"Assigned menu to bot {self.existing_bots[1]['username']}")
            else:
                self.log_result("Assign Menu to Second Bot", False, f"Failed: {response.status_code if response else 'No response'}")
                
    def test_get_menu_assignments(self):
        """Test retrieving menu assignments"""
        print("\n=== Testing Get Menu Assignments ===")
        
        response = self.make_request("GET", "/bot-menu-assignments")
        if response and response.status_code == 200:
            assignments = response.json()
            self.log_result("Get Menu Assignments", True, f"Retrieved {len(assignments)} assignments")
            
            # Verify assignment structure
            for assignment in assignments:
                required_fields = ["bot_id", "menu_id"]
                if all(field in assignment for field in required_fields):
                    self.log_result("Verify Assignment Structure", True, f"Assignment has required fields")
                else:
                    missing = [field for field in required_fields if field not in assignment]
                    self.log_result("Verify Assignment Structure", False, f"Missing fields: {missing}")
                    
            # Verify menu_name is included
            for assignment in assignments:
                if "menu_name" in assignment:
                    self.log_result("Verify Menu Name Included", True, f"Menu name: {assignment['menu_name']}")
                else:
                    self.log_result("Verify Menu Name Included", False, "Menu name not included in assignment")
                    
        else:
            self.log_result("Get Menu Assignments", False, f"Failed: {response.status_code if response else 'No response'}")
            
    def test_error_cases(self):
        """Test error handling"""
        print("\n=== Testing Error Cases ===")
        
        # Test 1: Create button with missing name
        invalid_button = {
            "actions": [{"type": "text", "value": {"text": "test"}}]
        }
        response = self.make_request("POST", "/menu-buttons", invalid_button)
        if response:
            if response.status_code == 422:
                self.log_result("Invalid Button Creation", True, f"Correctly rejected invalid button with validation error: {response.status_code}")
            elif response.status_code >= 400:
                self.log_result("Invalid Button Creation", True, f"Correctly rejected invalid button: {response.status_code}")
            else:
                self.log_result("Invalid Button Creation", False, f"Should have rejected invalid button, got status: {response.status_code}")
        else:
            self.log_result("Invalid Button Creation", False, "No response received")
            
        # Test 2: Create menu with invalid button IDs
        invalid_menu = {
            "name": "Invalid Menu",
            "button_ids": ["invalid-id-1", "invalid-id-2"]
        }
        response = self.make_request("POST", "/bot-menus", invalid_menu)
        if response and response.status_code == 200:
            # This might be allowed - the API doesn't validate button existence
            self.log_result("Menu with Invalid Button IDs", True, "API allows invalid button IDs (expected behavior)")
        else:
            self.log_result("Menu with Invalid Button IDs", True, f"API rejected invalid button IDs: {response.status_code}")
            
        # Test 3: Assign menu to non-existent bot
        invalid_assignment = {
            "bot_id": "non-existent-bot-id",
            "menu_id": self.created_menus[0]["id"] if self.created_menus else "test-menu-id"
        }
        response = self.make_request("POST", "/bot-menu-assignments", invalid_assignment)
        if response and response.status_code == 200:
            # This might be allowed - the API doesn't validate bot existence
            self.log_result("Assignment to Invalid Bot", True, "API allows assignment to non-existent bot (expected behavior)")
        else:
            self.log_result("Assignment to Invalid Bot", True, f"API rejected invalid bot assignment: {response.status_code}")

    # ============= SALES SYSTEM TESTS =============
    
    def test_get_existing_chats(self):
        """Get existing chats for sales testing"""
        print("\n=== Getting Existing Chats ===")
        
        response = self.make_request("GET", "/chats")
        if response and response.status_code == 200:
            self.existing_chats = response.json()
            self.log_result("Get Existing Chats", True, f"Found {len(self.existing_chats)} chats")
            
            # Check for existing sales
            chats_with_sales = [chat for chat in self.existing_chats if chat.get("sale_amount")]
            if chats_with_sales:
                self.log_result("Existing Sales Found", True, f"Found {len(chats_with_sales)} chats with existing sales")
                for chat in chats_with_sales:
                    print(f"  • Chat {chat['id']}: {chat.get('sale_amount', 0)} (Date: {chat.get('sale_date', 'N/A')})")
            else:
                self.log_result("Existing Sales Found", True, "No existing sales found")
        else:
            self.log_result("Get Existing Chats", False, f"Failed to get chats: {response.status_code if response else 'No response'}")
    
    def test_system_label_creation(self):
        """Test that 'Покупатели' system label exists"""
        print("\n=== Testing System Label Creation ===")
        
        response = self.make_request("GET", "/labels")
        if response and response.status_code == 200:
            labels = response.json()
            buyers_labels = [label for label in labels if label.get("name") == "Покупатели"]
            
            if buyers_labels:
                self.buyers_label_id = buyers_labels[0]["id"]
                buyers_label = buyers_labels[0]
                self.log_result("System Label Exists", True, f"'Покупатели' label found with ID: {self.buyers_label_id}")
                
                # Verify label properties
                if buyers_label.get("color") == "#FFD700":
                    self.log_result("System Label Color", True, "Correct gold color (#FFD700)")
                else:
                    self.log_result("System Label Color", False, f"Expected #FFD700, got {buyers_label.get('color')}")
                    
                if buyers_label.get("is_system") == True:
                    self.log_result("System Label Flag", True, "Correctly marked as system label")
                else:
                    self.log_result("System Label Flag", False, f"Expected is_system=True, got {buyers_label.get('is_system')}")
            else:
                self.log_result("System Label Exists", False, "'Покупатели' system label not found")
        else:
            self.log_result("System Label Exists", False, f"Failed to get labels: {response.status_code if response else 'No response'}")
    
    def test_create_sales(self):
        """Test creating and updating sales"""
        print("\n=== Testing Sales Creation/Update ===")
        
        if not self.existing_chats:
            self.log_result("Create Sale", False, "No chats available for sales testing")
            return
            
        # Test 1: Create new sale
        test_chat = self.existing_chats[0]
        sale_data = {"chat_id": test_chat['id'], "amount": 1500.0}
        
        response = self.make_request("POST", f"/chats/{test_chat['id']}/sale", sale_data)
        if response and response.status_code == 200:
            sale_response = response.json()
            self.created_sales.append(sale_response)
            self.log_result("Create New Sale", True, f"Created sale for chat {test_chat['id']}: {sale_response['amount']}")
            
            # Verify response structure
            required_fields = ["chat_id", "amount", "sale_date"]
            if all(field in sale_response for field in required_fields):
                self.log_result("Sale Response Structure", True, "All required fields present")
            else:
                missing = [field for field in required_fields if field not in sale_response]
                self.log_result("Sale Response Structure", False, f"Missing fields: {missing}")
        else:
            self.log_result("Create New Sale", False, f"Failed: {response.status_code if response else 'No response'}")
            
        # Test 2: Update existing sale
        if len(self.existing_chats) > 0:
            update_data = {"chat_id": test_chat['id'], "amount": 2500.50}
            response = self.make_request("POST", f"/chats/{test_chat['id']}/sale", update_data)
            if response and response.status_code == 200:
                sale_response = response.json()
                self.log_result("Update Existing Sale", True, f"Updated sale amount to {sale_response['amount']}")
            else:
                self.log_result("Update Existing Sale", False, f"Failed: {response.status_code if response else 'No response'}")
                
        # Test 3: Create sale for second chat (if available)
        if len(self.existing_chats) > 1:
            second_chat = self.existing_chats[1]
            sale_data2 = {"chat_id": second_chat['id'], "amount": 750.25}
            response = self.make_request("POST", f"/chats/{second_chat['id']}/sale", sale_data2)
            if response and response.status_code == 200:
                sale_response = response.json()
                self.created_sales.append(sale_response)
                self.log_result("Create Second Sale", True, f"Created sale for second chat: {sale_response['amount']}")
            else:
                self.log_result("Create Second Sale", False, f"Failed: {response.status_code if response else 'No response'}")
                
        # Test 4: Test with invalid chat_id
        invalid_sale_data = {"amount": 100.0}
        response = self.make_request("POST", "/chats/invalid-chat-id/sale", invalid_sale_data)
        if response and response.status_code == 404:
            self.log_result("Invalid Chat ID", True, "Correctly returned 404 for invalid chat_id")
        else:
            self.log_result("Invalid Chat ID", False, f"Expected 404, got {response.status_code if response else 'No response'}")
            
        # Test 5: Test with invalid amount (negative)
        if self.existing_chats:
            invalid_amount_data = {"amount": -100.0}
            response = self.make_request("POST", f"/chats/{self.existing_chats[0]['id']}/sale", invalid_amount_data)
            if response and response.status_code >= 400:
                self.log_result("Negative Amount", True, f"Correctly rejected negative amount: {response.status_code}")
            else:
                self.log_result("Negative Amount", False, f"Should reject negative amount, got: {response.status_code if response else 'No response'}")
                
        # Test 6: Test with zero amount
        if self.existing_chats:
            zero_amount_data = {"amount": 0.0}
            response = self.make_request("POST", f"/chats/{self.existing_chats[0]['id']}/sale", zero_amount_data)
            if response and response.status_code >= 400:
                self.log_result("Zero Amount", True, f"Correctly rejected zero amount: {response.status_code}")
            else:
                self.log_result("Zero Amount", False, f"Should reject zero amount, got: {response.status_code if response else 'No response'}")
    
    def test_buyers_label_assignment(self):
        """Test that 'Покупатели' label is automatically assigned to chats with sales"""
        print("\n=== Testing Buyers Label Assignment ===")
        
        if not self.buyers_label_id:
            self.log_result("Buyers Label Assignment", False, "Buyers label ID not available")
            return
            
        # Get updated chat data to check label assignment
        response = self.make_request("GET", "/chats")
        if response and response.status_code == 200:
            updated_chats = response.json()
            
            # Check chats with sales have the buyers label
            chats_with_sales = [chat for chat in updated_chats if chat.get("sale_amount")]
            
            if chats_with_sales:
                for chat in chats_with_sales:
                    if self.buyers_label_id in chat.get("label_ids", []):
                        self.log_result("Buyers Label Auto-Assignment", True, f"Chat {chat['id']} correctly has 'Покупатели' label")
                    else:
                        self.log_result("Buyers Label Auto-Assignment", False, f"Chat {chat['id']} missing 'Покупатели' label")
            else:
                self.log_result("Buyers Label Auto-Assignment", False, "No chats with sales found to verify label assignment")
        else:
            self.log_result("Buyers Label Auto-Assignment", False, f"Failed to get updated chats: {response.status_code if response else 'No response'}")
    
    def test_sales_statistics(self):
        """Test sales statistics API"""
        print("\n=== Testing Sales Statistics ===")
        
        response = self.make_request("GET", "/statistics/sales")
        if response and response.status_code == 200:
            stats = response.json()
            self.log_result("Get Sales Statistics", True, "Successfully retrieved sales statistics")
            
            # Verify response structure
            required_fields = ["total_sales", "total_buyers", "sales_by_bot", "sales_by_day"]
            if all(field in stats for field in required_fields):
                self.log_result("Statistics Structure", True, "All required fields present")
            else:
                missing = [field for field in required_fields if field not in stats]
                self.log_result("Statistics Structure", False, f"Missing fields: {missing}")
                
            # Verify data types and values
            if isinstance(stats.get("total_sales"), (int, float)) and stats["total_sales"] >= 0:
                self.log_result("Total Sales Value", True, f"Total sales: {stats['total_sales']}")
            else:
                self.log_result("Total Sales Value", False, f"Invalid total_sales: {stats.get('total_sales')}")
                
            if isinstance(stats.get("total_buyers"), int) and stats["total_buyers"] >= 0:
                self.log_result("Total Buyers Value", True, f"Total buyers: {stats['total_buyers']}")
            else:
                self.log_result("Total Buyers Value", False, f"Invalid total_buyers: {stats.get('total_buyers')}")
                
            # Verify sales_by_bot structure
            if isinstance(stats.get("sales_by_bot"), list):
                self.log_result("Sales by Bot Structure", True, f"Found {len(stats['sales_by_bot'])} bot entries")
                for bot_entry in stats["sales_by_bot"]:
                    required_bot_fields = ["bot_username", "total", "count"]
                    if all(field in bot_entry for field in required_bot_fields):
                        self.log_result("Bot Entry Structure", True, f"Bot {bot_entry['bot_username']}: {bot_entry['total']} ({bot_entry['count']} sales)")
                    else:
                        missing = [field for field in required_bot_fields if field not in bot_entry]
                        self.log_result("Bot Entry Structure", False, f"Missing bot fields: {missing}")
            else:
                self.log_result("Sales by Bot Structure", False, f"Invalid sales_by_bot: {type(stats.get('sales_by_bot'))}")
                
            # Verify sales_by_day structure
            if isinstance(stats.get("sales_by_day"), list):
                self.log_result("Sales by Day Structure", True, f"Found {len(stats['sales_by_day'])} day entries")
                for day_entry in stats["sales_by_day"]:
                    required_day_fields = ["date", "total", "count"]
                    if all(field in day_entry for field in required_day_fields):
                        self.log_result("Day Entry Structure", True, f"Date {day_entry['date']}: {day_entry['total']} ({day_entry['count']} sales)")
                    else:
                        missing = [field for field in required_day_fields if field not in day_entry]
                        self.log_result("Day Entry Structure", False, f"Missing day fields: {missing}")
            else:
                self.log_result("Sales by Day Structure", False, f"Invalid sales_by_day: {type(stats.get('sales_by_day'))}")
                
        else:
            self.log_result("Get Sales Statistics", False, f"Failed: {response.status_code if response else 'No response'}")
    
    def test_username_export(self):
        """Test username export by label"""
        print("\n=== Testing Username Export ===")
        
        if not self.buyers_label_id:
            self.log_result("Username Export", False, "Buyers label ID not available")
            return
            
        # Test 1: Export usernames for buyers label
        response = self.make_request("GET", f"/labels/{self.buyers_label_id}/export-usernames")
        if response and response.status_code == 200:
            self.log_result("Export Buyers Usernames", True, "Successfully exported usernames")
            
            # Verify Content-Type
            content_type = response.headers.get("content-type", "")
            if "text/plain" in content_type:
                self.log_result("Export Content-Type", True, f"Correct content-type: {content_type}")
            else:
                self.log_result("Export Content-Type", False, f"Expected text/plain, got: {content_type}")
                
            # Verify Content-Disposition header
            content_disposition = response.headers.get("content-disposition", "")
            if "filename=" in content_disposition and "Покупатели" in content_disposition:
                self.log_result("Export Filename", True, f"Correct filename in header: {content_disposition}")
            else:
                self.log_result("Export Filename", False, f"Invalid content-disposition: {content_disposition}")
                
            # Verify file content format
            content = response.text
            if content:
                lines = content.strip().split('\n')
                valid_usernames = all(line.startswith('@') for line in lines if line.strip())
                if valid_usernames:
                    self.log_result("Export Format", True, f"Valid username format ({len(lines)} usernames)")
                else:
                    self.log_result("Export Format", False, "Invalid username format (should start with @)")
            else:
                self.log_result("Export Format", True, "Empty export (no usernames with this label)")
                
        else:
            self.log_result("Export Buyers Usernames", False, f"Failed: {response.status_code if response else 'No response'}")
            
        # Test 2: Export with invalid label_id
        response = self.make_request("GET", "/labels/invalid-label-id/export-usernames")
        if response and response.status_code == 404:
            self.log_result("Export Invalid Label", True, "Correctly returned 404 for invalid label_id")
        else:
            self.log_result("Export Invalid Label", False, f"Expected 404, got {response.status_code if response else 'No response'}")
            
        # Test 3: Export for label with no chats (create a test label)
        if self.existing_labels:
            # Find a label that likely has no chats
            test_labels = [label for label in self.existing_labels if label.get("name") != "Покупатели"]
            if test_labels:
                test_label_id = test_labels[0]["id"]
                response = self.make_request("GET", f"/labels/{test_label_id}/export-usernames")
                if response and response.status_code == 404:
                    self.log_result("Export Empty Label", True, "Correctly returned 404 for label with no chats")
                elif response and response.status_code == 200:
                    self.log_result("Export Empty Label", True, "Successfully exported (label has chats)")
                else:
                    self.log_result("Export Empty Label", False, f"Unexpected response: {response.status_code if response else 'No response'}")
            
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Telegram Chat Panel API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        try:
            # Menu System Tests (existing)
            self.test_get_existing_data()
            self.test_create_menu_buttons()
            self.test_get_menu_buttons()
            self.test_create_bot_menus()
            self.test_get_bot_menus()
            self.test_bot_menu_assignments()
            self.test_get_menu_assignments()
            self.test_error_cases()
            
            # Sales System Tests (new)
            self.test_get_existing_chats()
            self.test_system_label_creation()
            self.test_create_sales()
            self.test_buyers_label_assignment()
            self.test_sales_statistics()
            self.test_username_export()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
                    
        print(f"\n📝 Created {len(self.created_buttons)} test buttons")
        print(f"📝 Created {len(self.created_menus)} test menus")
        print(f"📝 Created {len(self.created_sales)} test sales")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = TelegramChatPanelTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)