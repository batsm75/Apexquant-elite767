"""ApexQuant Elite - Backend API Testing (Public URL)"""
import requests
import json
import sys
import time

# Use the public URL
BASE_URL = "https://repo-preview-live-9.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def test(self, name, func):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n🔍 Testing: {name}")
        try:
            result = func()
            if result['success']:
                self.tests_passed += 1
                print(f"✅ PASS: {result.get('message', 'OK')}")
                self.results.append({'test': name, 'status': 'PASS', 'details': result.get('message', 'OK')})
            else:
                print(f"❌ FAIL: {result.get('message', 'Unknown error')}")
                self.results.append({'test': name, 'status': 'FAIL', 'details': result.get('message', 'Unknown error')})
        except Exception as e:
            print(f"❌ FAIL: {str(e)}")
            self.results.append({'test': name, 'status': 'FAIL', 'details': str(e)})

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        print("="*70)
        for r in self.results:
            status_icon = "✅" if r['status'] == 'PASS' else "❌"
            print(f"{status_icon} {r['test']}")
        print("="*70)
        return self.tests_passed == self.tests_run

def test_health():
    """Test /api/health endpoint"""
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=20)
        data = r.json()
        if r.status_code == 200 and data.get('status') == 'ok' and data.get('llm') is True:
            return {'success': True, 'message': f"Health OK, LLM: {data.get('llm')}, Model: {data.get('model')}"}
        return {'success': False, 'message': f"Status: {r.status_code}, Data: {data}"}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def test_llm_simple():
    """Test /api/llm/generate with simple text"""
    try:
        payload = {
            "contents": [{"role": "user", "parts": [{"text": "Balas HANYA: SIAP"}]}],
            "generationConfig": {"temperature": 0.2}
        }
        r = requests.post(f"{BASE_URL}/llm/generate", json=payload, timeout=180)
        data = r.json()
        text = data['candidates'][0]['content']['parts'][0]['text']
        if r.status_code == 200 and text.strip():
            return {'success': True, 'message': f"LLM responded: {text[:100]}"}
        return {'success': False, 'message': f"Status: {r.status_code}, Response: {text[:200]}"}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def test_store_operations():
    """Test MongoDB Firestore shim (PUT/GET/PATCH/DELETE)"""
    try:
        test_path = "artifacts/test/users/testuser/config/test_prefs"
        
        # PUT - create document
        r1 = requests.put(f"{BASE_URL}/store/doc", json={
            "path": test_path,
            "data": {"mode": "Scalping", "rr": "1:2"}
        }, timeout=20)
        
        # GET - retrieve document
        r2 = requests.get(f"{BASE_URL}/store/doc", params={"path": test_path}, timeout=20)
        data2 = r2.json()
        
        # PATCH - update document
        r3 = requests.patch(f"{BASE_URL}/store/doc", json={
            "path": test_path,
            "data": {"rr": "1:3"}
        }, timeout=20)
        
        # GET - verify update
        r4 = requests.get(f"{BASE_URL}/store/doc", params={"path": test_path}, timeout=20)
        data4 = r4.json()
        
        # DELETE - cleanup
        r5 = requests.delete(f"{BASE_URL}/store/doc", params={"path": test_path}, timeout=20)
        
        if (r1.status_code == 200 and 
            data2.get('exists') and data2['data']['mode'] == 'Scalping' and
            data4['data']['rr'] == '1:3' and
            r5.status_code == 200):
            return {'success': True, 'message': 'Store operations (PUT/GET/PATCH/DELETE) working'}
        return {'success': False, 'message': f"Store ops failed: PUT={r1.status_code}, GET={data2}, PATCH={r3.status_code}, GET2={data4}"}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def test_store_collection():
    """Test collection retrieval"""
    try:
        test_parent = "artifacts/test/users/testuser/history"
        
        # Create 3 documents
        for i in range(3):
            requests.put(f"{BASE_URL}/store/doc", json={
                "path": f"{test_parent}/doc{i}",
                "data": {"pair": f"PAIR{i}", "timestamp": 1000 + i}
            }, timeout=20)
        
        # Get collection
        r = requests.get(f"{BASE_URL}/store/collection", params={"path": test_parent}, timeout=20)
        data = r.json()
        
        # Cleanup
        for i in range(3):
            requests.delete(f"{BASE_URL}/store/doc", params={"path": f"{test_parent}/doc{i}"}, timeout=20)
        
        if r.status_code == 200 and data.get('count', 0) >= 3:
            return {'success': True, 'message': f"Collection retrieved: {data['count']} docs"}
        return {'success': False, 'message': f"Collection failed: {data}"}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def test_bitget_proxy():
    """Test Bitget proxy (fallback for Binance)"""
    try:
        r = requests.get(f"{BASE_URL}/proxy/bitget/candles", params={
            "symbol": "BTCUSDT",
            "granularity": "15min",
            "limit": 100
        }, timeout=40)
        data = r.json()
        if r.status_code == 200 and data.get('data') and len(data['data']) > 0:
            return {'success': True, 'message': f"Bitget candles: {len(data['data'])} candles"}
        return {'success': False, 'message': f"Bitget failed: {data}"}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def test_twelvedata_proxy():
    """Test TwelveData proxy (Forex)"""
    try:
        r1 = requests.get(f"{BASE_URL}/proxy/twelvedata/price", params={"symbol": "XAU/USD"}, timeout=40)
        r2 = requests.get(f"{BASE_URL}/proxy/twelvedata/time_series", params={
            "symbol": "XAU/USD",
            "interval": "15min",
            "outputsize": 100
        }, timeout=40)
        
        data1 = r1.json()
        data2 = r2.json()
        
        if 'price' in data1 and data2.get('values'):
            return {'success': True, 'message': f"TwelveData: price={data1['price']}, candles={len(data2['values'])}"}
        return {'success': False, 'message': f"TwelveData failed: price={data1}, series={data2.get('message', data2)}"}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def test_sosovalue_proxy():
    """Test Sosovalue proxy (graceful fallback expected)"""
    try:
        r = requests.get(f"{BASE_URL}/proxy/sosovalue", params={"symbol": "BTCUSDT"}, timeout=40)
        data = r.json()
        # Graceful fallback is expected, so any response with 'text' field is OK
        if r.status_code == 200 and 'text' in data:
            return {'success': True, 'message': f"Sosovalue: ok={data.get('ok')}, text_len={len(data['text'])}"}
        return {'success': False, 'message': f"Sosovalue failed: {data}"}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def test_deepseek_proxy():
    """Test DeepSeek verifier proxy (with Gemini fallback)"""
    try:
        prompt = 'Balas HANYA JSON: {"verified": true, "reason": "Test OK"}'
        r = requests.post(f"{BASE_URL}/proxy/deepseek", json={"prompt": prompt}, timeout=180)
        data = r.json()
        content = data['choices'][0]['message']['content']
        parsed = json.loads(content.replace('```json', '').replace('```', '').strip())
        
        if r.status_code == 200 and 'verified' in parsed and 'reason' in parsed:
            return {'success': True, 'message': f"DeepSeek/Gemini verifier: {parsed}"}
        return {'success': False, 'message': f"Verifier failed: {parsed}"}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def main():
    print("="*70)
    print("ApexQuant Elite - Backend API Testing")
    print(f"Testing against: {BASE_URL}")
    print("="*70)
    
    tester = BackendTester()
    
    # Core endpoints
    tester.test("Health Check", test_health)
    tester.test("LLM Generate (Simple Text)", test_llm_simple)
    
    # MongoDB Firestore shim
    tester.test("Store Operations (PUT/GET/PATCH/DELETE)", test_store_operations)
    tester.test("Store Collection Retrieval", test_store_collection)
    
    # Third-party proxies
    tester.test("Bitget Proxy (Futures fallback)", test_bitget_proxy)
    tester.test("TwelveData Proxy (Forex)", test_twelvedata_proxy)
    tester.test("Sosovalue Proxy (On-chain data)", test_sosovalue_proxy)
    tester.test("DeepSeek/Gemini Verifier Proxy", test_deepseek_proxy)
    
    # Print summary
    success = tester.print_summary()
    
    if not success:
        print("\n⚠️  Some backend tests failed. Check details above.")
        return 1
    
    print("\n✅ All backend tests passed!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
