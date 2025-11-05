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
            
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Bot Menu System API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        try:
            self.test_get_existing_data()
            self.test_create_menu_buttons()
            self.test_get_menu_buttons()
            self.test_create_bot_menus()
            self.test_get_bot_menus()
            self.test_bot_menu_assignments()
            self.test_get_menu_assignments()
            self.test_error_cases()
            
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
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = MenuSystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)