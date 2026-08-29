"""
ApexQuant Elite - Backend Testing for Morning Brief Feature
CRITICAL: FRUGAL testing - max 1 request per scenario, NO loops, NO ?force=true
NEVER write API key values to output - only mention variable names
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

class TestResults:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
    
    def add(self, scenario, status, details):
        self.results.append({
            'scenario': scenario,
            'status': status,
            'details': details
        })
        if status == 'PASS':
            self.passed += 1
        else:
            self.failed += 1
    
    def print_summary(self):
        print("\n" + "="*80)
        print(f"TEST SUMMARY: {self.passed} PASS, {self.failed} FAIL")
        print("="*80)
        for r in self.results:
            icon = "✅" if r['status'] == 'PASS' else "❌"
            print(f"{icon} {r['scenario']}")
            if r['status'] == 'FAIL':
                print(f"   Details: {r['details']}")
        print("="*80)

def test_morning_brief_structure(results):
    """Scenario 1: GET /api/news/morning-brief - verify structure and fields"""
    print("\n🔍 Scenario 1: GET /api/news/morning-brief (structure validation)")
    try:
        r = requests.get(f"{BASE_URL}/news/morning-brief", timeout=180)
        
        if r.status_code != 200:
            results.add("Morning Brief Structure", "FAIL", f"HTTP {r.status_code}: {r.text[:200]}")
            return
        
        data = r.json()
        
        # Check top-level structure
        if not data.get('ok'):
            results.add("Morning Brief Structure", "FAIL", "Missing 'ok' field or not true")
            return
        
        if 'cached' not in data:
            results.add("Morning Brief Structure", "FAIL", "Missing 'cached' field")
            return
        
        brief = data.get('brief')
        if not brief:
            results.add("Morning Brief Structure", "FAIL", "Missing 'brief' object")
            return
        
        # Check required fields
        required_fields = ['id', 'date', 'marketOpen', 'generatedAt', 'generatedAtWib', 
                          'events', 'headline', 'bias', 'summary', 'prediksi', 
                          'watchlist', 'caution', 'engine', 'aiGenerated']
        
        missing_fields = [f for f in required_fields if f not in brief]
        if missing_fields:
            results.add("Morning Brief Structure", "FAIL", f"Missing fields: {missing_fields}")
            return
        
        # Validate field types and content
        errors = []
        
        # Check date format (YYYY-MM-DD)
        if not brief['date'] or len(brief['date']) != 10:
            errors.append(f"date format invalid: {brief['date']}")
        
        # Check marketOpen
        if brief['marketOpen'] != '06:00':
            errors.append(f"marketOpen should be '06:00', got: {brief['marketOpen']}")
        
        # Check events structure
        if not isinstance(brief['events'], list):
            errors.append("events should be a list")
        else:
            for i, ev in enumerate(brief['events'][:3]):  # Check first 3 events
                if not ev.get('time', '').endswith(' WIB'):
                    errors.append(f"Event {i} time should end with ' WIB': {ev.get('time')}")
                if 'country' not in ev or 'title' not in ev or 'impact' not in ev:
                    errors.append(f"Event {i} missing required fields")
                if ev.get('impact') not in ['High', 'Medium']:
                    errors.append(f"Event {i} impact should be High/Medium: {ev.get('impact')}")
        
        # Check headline
        if not brief['headline'] or len(brief['headline']) < 5:
            errors.append(f"headline too short or empty: {brief['headline']}")
        
        # Check bias
        if brief['bias'] not in ['RISK-ON', 'RISK-OFF', 'NETRAL']:
            errors.append(f"bias should be RISK-ON|RISK-OFF|NETRAL: {brief['bias']}")
        
        # Check summary
        if not brief['summary'] or len(brief['summary']) < 10:
            errors.append(f"summary too short or empty")
        
        # Check prediksi (CRITICAL - must be list with 1-3 sentences, not empty)
        if not isinstance(brief['prediksi'], list):
            errors.append("prediksi should be a list")
        elif len(brief['prediksi']) == 0:
            errors.append("prediksi is EMPTY - should contain 1-3 sentences")
        elif len(brief['prediksi']) > 3:
            errors.append(f"prediksi has {len(brief['prediksi'])} items, should be 1-3")
        else:
            # Check if prediksi uses casual language (bahasa gaul)
            prediksi_text = ' '.join(brief['prediksi']).lower()
            casual_markers = ['kayaknya', 'bakal', 'mending', 'hati-hati', 'gaskeun', 
                            'rawan', 'dibikin', 'nih', 'deh', 'aja', 'sih']
            has_casual = any(marker in prediksi_text for marker in casual_markers)
            if not has_casual:
                errors.append(f"prediksi should use casual language (bahasa gaul), got: {brief['prediksi']}")
        
        # Check watchlist
        if not isinstance(brief['watchlist'], list):
            errors.append("watchlist should be a list")
        
        # Check engine
        if brief['engine'] not in ['deepseek', 'gemini', 'kalender']:
            errors.append(f"engine should be deepseek|gemini|kalender: {brief['engine']}")
        
        # Check aiGenerated
        if not isinstance(brief['aiGenerated'], bool):
            errors.append("aiGenerated should be boolean")
        
        # Check for ObjectId/_id leakage
        brief_str = json.dumps(brief)
        if '_id' in brief_str or 'ObjectId' in brief_str:
            errors.append("Response contains ObjectId/_id - not JSON-serializable!")
        
        if errors:
            results.add("Morning Brief Structure", "FAIL", "; ".join(errors))
            return
        
        # Success - print key info
        print(f"   ✓ Structure valid")
        print(f"   ✓ Date: {brief['date']}, Market Open: {brief['marketOpen']}")
        print(f"   ✓ Engine: {brief['engine']}, AI Generated: {brief['aiGenerated']}")
        print(f"   ✓ Bias: {brief['bias']}")
        print(f"   ✓ Events: {len(brief['events'])} items")
        print(f"   ✓ Prediksi: {len(brief['prediksi'])} sentences (bahasa gaul)")
        print(f"   ✓ Prediksi content: {brief['prediksi']}")
        
        results.add("Morning Brief Structure", "PASS", 
                   f"All fields valid, engine={brief['engine']}, prediksi={len(brief['prediksi'])} sentences")
        
        # Return brief for cache test
        return brief
        
    except Exception as e:
        results.add("Morning Brief Structure", "FAIL", str(e))
        return None

def test_morning_brief_cache(results, first_brief):
    """Scenario 2: Cache test - call twice, verify caching works"""
    print("\n🔍 Scenario 2: Morning Brief Cache (daily cache verification)")
    try:
        # Second call - should be cached
        r = requests.get(f"{BASE_URL}/news/morning-brief", timeout=30)
        
        if r.status_code != 200:
            results.add("Morning Brief Cache", "FAIL", f"HTTP {r.status_code}")
            return
        
        data = r.json()
        
        # Check cached flag
        if not data.get('cached'):
            results.add("Morning Brief Cache", "FAIL", 
                       "Second call should have cached=true (no new AI call)")
            return
        
        brief2 = data.get('brief')
        if not brief2:
            results.add("Morning Brief Cache", "FAIL", "Missing brief in cached response")
            return
        
        # Verify id and generatedAt are IDENTICAL (proves it's cached)
        if first_brief:
            if brief2['id'] != first_brief['id']:
                results.add("Morning Brief Cache", "FAIL", 
                           f"ID changed: {first_brief['id']} -> {brief2['id']} (not cached!)")
                return
            
            if brief2['generatedAt'] != first_brief['generatedAt']:
                results.add("Morning Brief Cache", "FAIL", 
                           f"generatedAt changed (not cached!)")
                return
        
        print(f"   ✓ cached=true")
        print(f"   ✓ ID identical: {brief2['id']}")
        print(f"   ✓ generatedAt identical: {brief2['generatedAt']}")
        
        results.add("Morning Brief Cache", "PASS", 
                   "Cache working - no new AI call, id/generatedAt identical")
        
    except Exception as e:
        results.add("Morning Brief Cache", "FAIL", str(e))

def test_deepseek_fallback(results):
    """Scenario 3: POST /api/proxy/deepseek - verify fallback to Gemini works"""
    print("\n🔍 Scenario 3: POST /api/proxy/deepseek (fallback verification)")
    try:
        payload = {
            "prompt": 'Balas JSON {"verified": true, "reason": "tes singkat"}'
        }
        r = requests.post(f"{BASE_URL}/proxy/deepseek", json=payload, timeout=180)
        
        print(f"   Status code: {r.status_code}")
        
        if r.status_code != 200:
            results.add("DeepSeek Fallback", "FAIL", 
                       f"HTTP {r.status_code}: {r.text[:200]}")
            return
        
        data = r.json()
        
        # Check structure: {choices: [{message: {content: "<JSON string>"}}]}
        if 'choices' not in data:
            results.add("DeepSeek Fallback", "FAIL", "Missing 'choices' field")
            return
        
        if not data['choices'] or len(data['choices']) == 0:
            results.add("DeepSeek Fallback", "FAIL", "choices array is empty")
            return
        
        content = data['choices'][0].get('message', {}).get('content')
        if not content:
            results.add("DeepSeek Fallback", "FAIL", "Missing content in message")
            return
        
        # Try to parse content as JSON
        try:
            content_clean = content.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(content_clean)
            
            print(f"   ✓ Fallback to Gemini successful")
            print(f"   ✓ Content parseable as JSON: {parsed}")
            
            results.add("DeepSeek Fallback", "PASS", 
                       f"Fallback working, content parseable: {parsed}")
            
        except json.JSONDecodeError as e:
            results.add("DeepSeek Fallback", "FAIL", 
                       f"Content not valid JSON: {content[:200]}")
        
    except Exception as e:
        results.add("DeepSeek Fallback", "FAIL", str(e))

def test_llm_generate(results):
    """Scenario 4: POST /api/llm/generate - verify GEMINI_API_KEY works"""
    print("\n🔍 Scenario 4: POST /api/llm/generate (GEMINI_API_KEY verification)")
    try:
        payload = {
            "contents": [{"role": "user", "parts": [{"text": "Balas satu kata: OK"}]}],
            "generationConfig": {"temperature": 0}
        }
        r = requests.post(f"{BASE_URL}/llm/generate", json=payload, timeout=180)
        
        if r.status_code != 200:
            results.add("LLM Generate", "FAIL", f"HTTP {r.status_code}: {r.text[:200]}")
            return
        
        data = r.json()
        
        # Check structure
        if 'candidates' not in data or not data['candidates']:
            results.add("LLM Generate", "FAIL", "Missing candidates in response")
            return
        
        text = data['candidates'][0].get('content', {}).get('parts', [{}])[0].get('text')
        if not text:
            results.add("LLM Generate", "FAIL", "Missing text in response")
            return
        
        print(f"   ✓ GEMINI_API_KEY working")
        print(f"   ✓ Response: {text[:100]}")
        
        results.add("LLM Generate", "PASS", f"GEMINI_API_KEY working, response: {text[:50]}")
        
    except Exception as e:
        results.add("LLM Generate", "FAIL", str(e))

def test_no_key_exposure(results):
    """Scenario 5: GET /api/health and GET /api/ - verify no API keys exposed"""
    print("\n🔍 Scenario 5: API Key Exposure Check")
    try:
        # Test /api/health
        r1 = requests.get(f"{BASE_URL}/health", timeout=20)
        if r1.status_code != 200:
            results.add("No Key Exposure", "FAIL", f"/health returned {r1.status_code}")
            return
        
        health_data = r1.json()
        health_str = json.dumps(health_data)
        
        # Test /api/
        r2 = requests.get(f"{BASE_URL}/", timeout=20)
        if r2.status_code != 200:
            results.add("No Key Exposure", "FAIL", f"/ returned {r2.status_code}")
            return
        
        root_data = r2.json()
        root_str = json.dumps(root_data)
        
        # Check for API key patterns (but don't print them!)
        key_patterns = ['AIzaSy', 'sk-', 'SOSO-', 'Bearer ', 'apikey=']
        exposed = []
        
        for pattern in key_patterns:
            if pattern in health_str or pattern in root_str:
                exposed.append(f"Pattern '{pattern}' found in response")
        
        if exposed:
            results.add("No Key Exposure", "FAIL", "; ".join(exposed))
            return
        
        print(f"   ✓ /health: {health_data}")
        print(f"   ✓ /: {root_data}")
        print(f"   ✓ No API key patterns found in responses")
        
        results.add("No Key Exposure", "PASS", "No API keys exposed in /health or /")
        
    except Exception as e:
        results.add("No Key Exposure", "FAIL", str(e))

def test_regression_context(results):
    """Scenario 6a: GET /api/news/context - regression test"""
    print("\n🔍 Scenario 6a: GET /api/news/context (regression)")
    try:
        r = requests.get(f"{BASE_URL}/news/context", params={"hint": "XAUUSD"}, timeout=30)
        
        if r.status_code != 200:
            results.add("Context Regression", "FAIL", f"HTTP {r.status_code}")
            return
        
        data = r.json()
        
        if 'ok' not in data:
            results.add("Context Regression", "FAIL", "Missing 'ok' field")
            return
        
        print(f"   ✓ Status: 200")
        print(f"   ✓ ok: {data.get('ok')}")
        print(f"   ✓ context length: {len(data.get('context', ''))} chars")
        
        results.add("Context Regression", "PASS", f"ok={data.get('ok')}")
        
    except Exception as e:
        results.add("Context Regression", "FAIL", str(e))

def test_regression_store(results):
    """Scenario 6b: PUT/GET /api/store/doc - regression test"""
    print("\n🔍 Scenario 6b: PUT/GET /api/store/doc (regression)")
    try:
        test_path = "users/test-agent/config/preferences_v88"
        test_data = {"theme": "dark", "rr": "1:3", "timestamp": datetime.now().isoformat()}
        
        # PUT
        r1 = requests.put(f"{BASE_URL}/store/doc", json={
            "path": test_path,
            "data": test_data
        }, timeout=20)
        
        if r1.status_code != 200:
            results.add("Store Regression", "FAIL", f"PUT returned {r1.status_code}")
            return
        
        # GET
        r2 = requests.get(f"{BASE_URL}/store/doc", params={"path": test_path}, timeout=20)
        
        if r2.status_code != 200:
            results.add("Store Regression", "FAIL", f"GET returned {r2.status_code}")
            return
        
        data = r2.json()
        
        if not data.get('exists'):
            results.add("Store Regression", "FAIL", "Document not found after PUT")
            return
        
        retrieved_data = data.get('data', {})
        if retrieved_data.get('theme') != test_data['theme'] or retrieved_data.get('rr') != test_data['rr']:
            results.add("Store Regression", "FAIL", "Data mismatch after round-trip")
            return
        
        print(f"   ✓ PUT successful")
        print(f"   ✓ GET successful")
        print(f"   ✓ Data round-trip verified: {retrieved_data}")
        
        results.add("Store Regression", "PASS", "PUT/GET round-trip successful")
        
    except Exception as e:
        results.add("Store Regression", "FAIL", str(e))

def main():
    print("="*80)
    print("ApexQuant Elite - Morning Brief Backend Testing")
    print(f"Base URL: {BASE_URL}")
    print("FRUGAL MODE: Max 1 request per scenario, NO ?force=true")
    print("="*80)
    
    results = TestResults()
    
    # Run tests in order
    first_brief = test_morning_brief_structure(results)
    test_morning_brief_cache(results, first_brief)
    test_deepseek_fallback(results)
    test_llm_generate(results)
    test_no_key_exposure(results)
    test_regression_context(results)
    test_regression_store(results)
    
    # Print summary
    results.print_summary()
    
    return 0 if results.failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
