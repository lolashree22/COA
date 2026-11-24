"""
USN 25BTRIS028 - CPU Performance Evaluation for Online Examination Systems
Educational discrete-event CPU scheduling model; not a production server benchmark.
Run from this folder: python src/exam_cpu_sim.py
"""
import csv, json, random
from pathlib import Path
OUT=Path("results"); OUT.mkdir(exist_ok=True)
SEED=28
QUANTUM_MS=5.0
MEMORY_PER_USER_MB=18.0
TASK_TYPES={"load_question":12.0,"save_answer":4.0,"submit_exam":15.0}

def create_tasks(users, seed=SEED):
    rng=random.Random(seed+users); tasks=[]
    for u in range(users):
        base=rng.uniform(0,100)
        tasks.append({"user":u,"kind":"load_question","arrival":base,"burst":TASK_TYPES["load_question"]})
        for k in range(3):
            tasks.append({"user":u,"kind":"save_answer","arrival":base+20+k*20+rng.uniform(0,4),"burst":TASK_TYPES["save_answer"]})
        tasks.append({"user":u,"kind":"submit_exam","arrival":base+90+rng.uniform(0,10),"burst":TASK_TYPES["submit_exam"]})
    return sorted(tasks,key=lambda x:x["arrival"])

def simulate_fcfs(tasks):
    now=0.0; rows=[]
    for t in tasks:
        start=max(now,t["arrival"]); finish=start+t["burst"]
        rows.append({**t,"start":start,"finish":finish,"response":finish-t["arrival"],"wait":start-t["arrival"]})
        now=finish
    return rows

def simulate_round_robin(tasks, quantum=QUANTUM_MS):
    pending=[dict(t,remaining=t["burst"]) for t in tasks]
    i=0; now=0.0; ready=[]; rows=[]
    while i<len(pending) or ready:
        if not ready and i<len(pending) and now<pending[i]["arrival"]: now=pending[i]["arrival"]
        while i<len(pending) and pending[i]["arrival"]<=now:
            ready.append(pending[i]); i+=1
        if not ready: continue
        task=ready.pop(0)
        if "first_start" not in task: task["first_start"]=now
        run=min(quantum,task["remaining"]); now+=run; task["remaining"]-=run
        while i<len(pending) and pending[i]["arrival"]<=now:
            ready.append(pending[i]); i+=1
        if task["remaining"]>1e-9: ready.append(task)
        else:
            rows.append({**task,"start":task["first_start"],"finish":now,
                         "response":now-task["arrival"],"wait":now-task["arrival"]-task["burst"]})
    return rows

def metrics(rows, users):
    makespan=max(r["finish"] for r in rows)-min(r["arrival"] for r in rows)
    total_cpu=sum(r["burst"] for r in rows)
    return {"users":users,"tasks":len(rows),
            "avg_turnaround_ms":sum(r["response"] for r in rows)/len(rows),
            "avg_wait_ms":sum(r["wait"] for r in rows)/len(rows),
            "throughput_tasks_per_s":len(rows)/(makespan/1000),
            "cpu_utilization_pct":100*total_cpu/makespan if makespan else 0,
            "estimated_peak_memory_mb":users*MEMORY_PER_USER_MB,
            "makespan_ms":makespan}

def main():
    results=[]
    for users in [10,25,50,100,200]:
        tasks=create_tasks(users)
        results.append({**metrics(simulate_fcfs(tasks),users),"scheduler":"FCFS"})
        results.append({**metrics(simulate_round_robin(tasks),users),"scheduler":"Round Robin (5 ms quantum)"})
    with open(OUT/"cpu_results.csv","w",newline="") as f:
        w=csv.DictWriter(f,fieldnames=results[0].keys()); w.writeheader(); w.writerows(results)
    with open(OUT/"cpu_summary.json","w") as f:
        json.dump({"model":"synthetic discrete-event educational simulation","seed":SEED,
                   "users_tested":[10,25,50,100,200],"memory_per_active_user_mb":MEMORY_PER_USER_MB,
                   "round_robin_quantum_ms":QUANTUM_MS,
                   "task_mix_per_user":"1 question load + 3 answer saves + 1 submission",
                   "task_bursts_ms":TASK_TYPES,"results":results},f,indent=2)
    for r in results:
        print(f'{r["users"]:>3} users | {r["scheduler"]:<24} | turnaround={r["avg_turnaround_ms"]:.2f} ms | wait={r["avg_wait_ms"]:.2f} ms')
if __name__=="__main__": main()
