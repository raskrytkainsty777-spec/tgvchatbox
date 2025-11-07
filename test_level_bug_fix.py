#!/usr/bin/env python3
"""
Test script for menu button level bug fix
Tests that level field is correctly saved when creating menu buttons
"""

import requests
import json
import sys

# Backend URL from environment
BACKEND_URL = "https://safe-deploy-hub.preview.emergentagent.com/api"

class LevelBugFixTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_button_ids = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
        
    def make_request(self, method, endpoint, data=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == "GET":
                response = self.session.get(url, timeout=30)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=30)
            elif method == "PUT":
                response = self.session.put(url, json=data, timeout=30)
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
    
    def test_create_button_level_2(self):
        """Test Case 1: Create button with level=2"""
        print("\n=== Test Case 1: Create button with level=2 ===")
        
        button_data = {
            "name": "Тест кнопка уровень 2",
            "command": "test_level2",
            "level": 2,
            "actions": [
                {
                    "type": "text",
                    "value": {"text": "Это кнопка второго уровня"}
                }
            ]
        }
        
        response = self.make_request("POST", "/menu-buttons", button_data)
        
        if not response:
            self.log_result("Create Button Level 2", False, "No response from server")
            return None
            
        if response.status_code != 200:
            self.log_result("Create Button Level 2", False, 
                          f"Expected 200, got {response.status_code}",
                          response.text)
            return None
            
        try:
            response_data = response.json()
        except:
            self.log_result("Create Button Level 2", False, "Invalid JSON response", response.text)
            return None
            
        # Verify response structure
        if "id" not in response_data:
            self.log_result("Create Button Level 2", False, "Response missing 'id' field", response_data)
            return None
            
        button_id = response_data["id"]
        self.created_button_ids.append(button_id)
        
        # Verify level field
        if "level" not in response_data:
            self.log_result("Create Button Level 2", False, "Response missing 'level' field", response_data)
            return button_id
            
        if response_data["level"] != 2:
            self.log_result("Create Button Level 2", False, 
                          f"Expected level=2, got level={response_data['level']}", 
                          response_data)
            return button_id
            
        # Verify command field
        if "command" not in response_data:
            self.log_result("Create Button Level 2", False, "Response missing 'command' field", response_data)
            return button_id
            
        if response_data["command"] != "test_level2":
            self.log_result("Create Button Level 2", False, 
                          f"Expected command='test_level2', got command='{response_data['command']}'", 
                          response_data)
            return button_id
            
        self.log_result("Create Button Level 2", True, 
                       f"Button created successfully with level=2 and command='test_level2'",
                       f"Button ID: {button_id}")
        return button_id
    
    def test_create_button_level_3(self):
        """Test Case 2: Create button with level=3"""
        print("\n=== Test Case 2: Create button with level=3 ===")
        
        button_data = {
            "name": "Тест кнопка уровень 3",
            "command": "test_level3",
            "level": 3,
            "actions": []
        }
        
        response = self.make_request("POST", "/menu-buttons", button_data)
        
        if not response:
            self.log_result("Create Button Level 3", False, "No response from server")
            return None
            
        if response.status_code != 200:
            self.log_result("Create Button Level 3", False, 
                          f"Expected 200, got {response.status_code}",
                          response.text)
            return None
            
        try:
            response_data = response.json()
        except:
            self.log_result("Create Button Level 3", False, "Invalid JSON response", response.text)
            return None
            
        button_id = response_data.get("id")
        if button_id:
            self.created_button_ids.append(button_id)
        
        # Verify level field
        if response_data.get("level") != 3:
            self.log_result("Create Button Level 3", False, 
                          f"Expected level=3, got level={response_data.get('level')}", 
                          response_data)
            return button_id
            
        self.log_result("Create Button Level 3", True, 
                       f"Button created successfully with level=3",
                       f"Button ID: {button_id}")
        return button_id
    
    def test_verify_buttons_in_db(self, button_id_level2, button_id_level3):
        """Test Case 3: Verify buttons saved in DB with correct levels"""
        print("\n=== Test Case 3: Verify buttons in database ===")
        
        if not button_id_level2 and not button_id_level3:
            self.log_result("Verify Buttons in DB", False, "No button IDs to verify")
            return
            
        response = self.make_request("GET", "/menu-buttons")
        
        if not response or response.status_code != 200:
            self.log_result("Verify Buttons in DB", False, 
                          f"Failed to get buttons: {response.status_code if response else 'No response'}")
            return
            
        try:
            all_buttons = response.json()
        except:
            self.log_result("Verify Buttons in DB", False, "Invalid JSON response", response.text)
            return
            
        # Find our created buttons
        button_level2 = None
        button_level3 = None
        
        for button in all_buttons:
            if button.get("id") == button_id_level2:
                button_level2 = button
            if button.get("id") == button_id_level3:
                button_level3 = button
                
        # Verify level 2 button
        if button_id_level2:
            if not button_level2:
                self.log_result("Verify Level 2 in DB", False, 
                              f"Button with ID {button_id_level2} not found in database")
            elif button_level2.get("level") != 2:
                self.log_result("Verify Level 2 in DB", False, 
                              f"Expected level=2, got level={button_level2.get('level')}",
                              button_level2)
            else:
                self.log_result("Verify Level 2 in DB", True, 
                              "Button with level=2 correctly saved in database",
                              f"Name: {button_level2.get('name')}, Command: {button_level2.get('command')}")
                
        # Verify level 3 button
        if button_id_level3:
            if not button_level3:
                self.log_result("Verify Level 3 in DB", False, 
                              f"Button with ID {button_id_level3} not found in database")
            elif button_level3.get("level") != 3:
                self.log_result("Verify Level 3 in DB", False, 
                              f"Expected level=3, got level={button_level3.get('level')}",
                              button_level3)
            else:
                self.log_result("Verify Level 3 in DB", True, 
                              "Button with level=3 correctly saved in database",
                              f"Name: {button_level3.get('name')}, Command: {button_level3.get('command')}")
    
    def test_create_button_without_level(self):
        """Test Case 4: Create button without level (should default to 1)"""
        print("\n=== Test Case 4: Create button without level (default) ===")
        
        button_data = {
            "name": "Кнопка без level",
            "actions": []
        }
        
        response = self.make_request("POST", "/menu-buttons", button_data)
        
        if not response:
            self.log_result("Create Button Default Level", False, "No response from server")
            return None
            
        if response.status_code != 200:
            self.log_result("Create Button Default Level", False, 
                          f"Expected 200, got {response.status_code}",
                          response.text)
            return None
            
        try:
            response_data = response.json()
        except:
            self.log_result("Create Button Default Level", False, "Invalid JSON response", response.text)
            return None
            
        button_id = response_data.get("id")
        if button_id:
            self.created_button_ids.append(button_id)
        
        # Verify level defaults to 1
        if response_data.get("level") != 1:
            self.log_result("Create Button Default Level", False, 
                          f"Expected default level=1, got level={response_data.get('level')}", 
                          response_data)
            return button_id
            
        self.log_result("Create Button Default Level", True, 
                       "Button created with default level=1",
                       f"Button ID: {button_id}")
        return button_id
    
    def test_update_button_level(self):
        """Test Case 5: Update button level"""
        print("\n=== Test Case 5: Update button level ===")
        
        # First create a button with level=1
        button_data = {
            "name": "Кнопка для обновления",
            "command": "test_update",
            "level": 1,
            "actions": []
        }
        
        response = self.make_request("POST", "/menu-buttons", button_data)
        
        if not response or response.status_code != 200:
            self.log_result("Update Button Level - Create", False, 
                          f"Failed to create button: {response.status_code if response else 'No response'}")
            return
            
        try:
            created_button = response.json()
        except:
            self.log_result("Update Button Level - Create", False, "Invalid JSON response")
            return
            
        button_id = created_button.get("id")
        if not button_id:
            self.log_result("Update Button Level - Create", False, "No button ID in response")
            return
            
        self.created_button_ids.append(button_id)
        
        if created_button.get("level") != 1:
            self.log_result("Update Button Level - Create", False, 
                          f"Initial button should have level=1, got {created_button.get('level')}")
            return
            
        self.log_result("Update Button Level - Create", True, 
                       f"Created button with level=1, ID: {button_id}")
        
        # Now update it to level=2
        update_data = {
            "name": "Кнопка для обновления (обновлено)",
            "command": "test_update_v2",
            "level": 2,
            "actions": []
        }
        
        response = self.make_request("PUT", f"/menu-buttons/{button_id}", update_data)
        
        if not response or response.status_code != 200:
            self.log_result("Update Button Level - Update", False, 
                          f"Failed to update button: {response.status_code if response else 'No response'}",
                          response.text if response else None)
            return
            
        try:
            updated_button = response.json()
        except:
            self.log_result("Update Button Level - Update", False, "Invalid JSON response")
            return
            
        # Verify level changed to 2
        if updated_button.get("level") != 2:
            self.log_result("Update Button Level - Update", False, 
                          f"Expected level=2 after update, got level={updated_button.get('level')}", 
                          updated_button)
            return
            
        # Verify command also updated
        if updated_button.get("command") != "test_update_v2":
            self.log_result("Update Button Level - Update", False, 
                          f"Expected command='test_update_v2', got command='{updated_button.get('command')}'", 
                          updated_button)
            return
            
        self.log_result("Update Button Level - Update", True, 
                       "Button level successfully updated from 1 to 2",
                       f"New command: {updated_button.get('command')}")
    
    def cleanup(self):
        """Clean up created test buttons"""
        print("\n=== Cleanup: Deleting test buttons ===")
        
        deleted_count = 0
        failed_count = 0
        
        for button_id in self.created_button_ids:
            response = self.make_request("DELETE", f"/menu-buttons/{button_id}")
            if response and response.status_code == 200:
                deleted_count += 1
                print(f"  ✅ Deleted button {button_id}")
            else:
                failed_count += 1
                print(f"  ❌ Failed to delete button {button_id}")
                
        print(f"Cleanup complete: {deleted_count} deleted, {failed_count} failed")
    
    def run_all_tests(self):
        """Run all test cases"""
        print("🚀 Starting Menu Button Level Bug Fix Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 70)
        
        try:
            # Test Case 1: Create button with level=2
            button_id_level2 = self.test_create_button_level_2()
            
            # Test Case 2: Create button with level=3
            button_id_level3 = self.test_create_button_level_3()
            
            # Test Case 3: Verify buttons in database
            self.test_verify_buttons_in_db(button_id_level2, button_id_level3)
            
            # Test Case 4: Create button without level (default)
            self.test_create_button_without_level()
            
            # Test Case 5: Update button level
            self.test_update_button_level()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            # Cleanup
            self.cleanup()
            
        # Print summary
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        
        if total_tests > 0:
            print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
                    if result.get("details"):
                        print(f"    Details: {result['details']}")
        else:
            print("\n🎉 ALL TESTS PASSED! Bug fix verified successfully.")
                    
        return failed_tests == 0

if __name__ == "__main__":
    tester = LevelBugFixTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
