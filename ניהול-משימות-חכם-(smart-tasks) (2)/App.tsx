
import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority, SubTask, TaskStatus } from './types';
import { analyzeTaskWithAI } from './services/geminiService';
import { TaskItem } from './components/TaskItem';
import { Plus, Sparkles, Loader2, CalendarCheck, Flag, Calendar, Bell, BellRing, Download } from 'lucide-react';

// Helper for generating IDs safely
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>(''); // For input state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    // Show the install prompt
    installPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setInstallPrompt(null);
  };

  // Load permission status
  useEffect(() => {
    if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request Notification Permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("הדפדפן שלך לא תומך בהתראות");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
       new Notification("התראות מופעלות!", { body: "מעכשיו תקבל תזכורת כשיגיע זמן המשימה." });
    }
  };

  // Check for due tasks every minute
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const checkInterval = setInterval(() => {
        const now = Date.now();
        tasks.forEach(task => {
            if (task.status === 'completed' || !task.dueDate) return;
            
            // Check if task is due now (within the last minute window to avoid double notification)
            const timeDiff = now - task.dueDate;
            // Allow a 60 second window after the due time
            if (timeDiff >= 0 && timeDiff < 60000) {
                new Notification(`תזכורת: ${task.title}`, {
                    body: "הגיע הזמן לבצע את המשימה!",
                    icon: "/manifest-icon-192.png" // Assumes icon exists, fallback is browser default
                });
            }
        });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [tasks, notificationPermission]);

  // Load from local storage with migration for legacy data
  useEffect(() => {
    const saved = localStorage.getItem('smart-tasks-data');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        if (Array.isArray(parsedData)) {
          // Migrate old tasks
          const migratedTasks = parsedData.map((t: any) => {
            let status: TaskStatus = t.status;
            // If no status exists, derive it from isCompleted
            if (!status) {
              status = t.isCompleted ? 'completed' : 'pending';
            }
            
            return {
              ...t,
              priority: t.priority || Priority.MEDIUM,
              subtasks: t.subtasks || [],
              status: status,
              notes: t.notes || '',
              dueDate: t.dueDate || undefined, // Sync legacy data
              isCompleted: status === 'completed' // Ensure sync
            };
          });
          setTasks(migratedTasks);
        }
      } catch (e) {
        console.error("Failed to load tasks", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('smart-tasks-data', JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const dueDateTimestamp = newTaskDueDate ? new Date(newTaskDueDate).getTime() : undefined;

    const newTask: Task = {
      id: generateId(),
      title: newTaskTitle,
      isCompleted: false,
      status: 'pending',
      priority: newTaskPriority,
      subtasks: [],
      notes: '',
      dueDate: dueDateTimestamp,
      createdAt: Date.now(),
    };

    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskPriority(Priority.MEDIUM);
    setNewTaskDueDate('');
    // Scroll to top
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const handleSmartAdd = async () => {
    if (!newTaskTitle.trim()) return;
    
    setIsAiLoading(true);
    
    try {
      const analysis = await analyzeTaskWithAI(newTaskTitle);
      
      let priorityEnum = Priority.MEDIUM;
      if (analysis?.priority === 'high') priorityEnum = Priority.HIGH;
      else if (analysis?.priority === 'low') priorityEnum = Priority.LOW;
      else if (analysis?.priority === 'medium') priorityEnum = Priority.MEDIUM;
      else priorityEnum = newTaskPriority;

      const subtasks: SubTask[] = analysis?.subtasks.map(st => ({
        id: generateId(),
        title: st,
        isCompleted: false
      })) || [];

      const dueDateTimestamp = newTaskDueDate ? new Date(newTaskDueDate).getTime() : undefined;

      const newTask: Task = {
        id: generateId(),
        title: newTaskTitle,
        description: analysis?.refinedDescription || '',
        isCompleted: false,
        status: 'pending',
        priority: priorityEnum,
        subtasks: subtasks,
        estimatedTime: analysis?.estimatedTime,
        notes: '',
        dueDate: dueDateTimestamp,
        createdAt: Date.now(),
      };

      setTasks([newTask, ...tasks]);
      setNewTaskTitle('');
      setNewTaskPriority(Priority.MEDIUM);
      setNewTaskDueDate('');
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch (error) {
      console.error("AI Error", error);
      handleAddTask();
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id !== id) return t;
      const newIsCompleted = !t.isCompleted;
      return { 
        ...t, 
        isCompleted: newIsCompleted,
        status: newIsCompleted ? 'completed' : 'pending' 
      };
    }));
  };

  const updateTaskStatus = (id: string, newStatus: TaskStatus) => {
    setTasks(tasks.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        status: newStatus,
        isCompleted: newStatus === 'completed'
      };
    }));
  };

  const updateTaskNotes = (id: string, notes: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, notes } : t));
  };

  const updateTaskDueDate = (id: string, date: number | undefined) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, dueDate: date } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const changeTaskPriority = (taskId: string, newPriority: Priority) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, priority: newPriority } : t));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(tasks.map(t => {
      if (t.id !== taskId) return t;
      const updatedSubtasks = t.subtasks.map(st => 
        st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
      );
      
      let newStatus = t.status;
      const anySubtaskDone = updatedSubtasks.some(st => st.isCompleted);

      if (anySubtaskDone && t.status === 'pending') {
        newStatus = 'in_progress';
      }

      return { ...t, subtasks: updatedSubtasks, status: newStatus };
    }));
  };

  const addManualSubtask = (taskId: string, title: string) => {
    setTasks(tasks.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        subtasks: [...(t.subtasks || []), { id: generateId(), title, isCompleted: false }],
        status: t.status === 'pending' ? 'in_progress' : t.status
      };
    }));
  };

  const cycleNewTaskPriority = () => {
    const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH];
    const currentIndex = priorities.indexOf(newTaskPriority);
    setNewTaskPriority(priorities[(currentIndex + 1) % priorities.length]);
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.HIGH: return 'text-red-500 bg-red-50 border-red-200';
      case Priority.MEDIUM: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case Priority.LOW: return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-slate-400';
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'pending') return t.status !== 'completed';
    return true;
  });

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 overflow-hidden">
      
      {/* 1. Mobile Header (Fixed) */}
      <header className="bg-white shadow-sm pt-safe-top z-20 flex-shrink-0">
        <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">המשימות שלי</h1>
          
          <div className="flex items-center gap-2">
            {installPrompt && (
               <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-blue-700 transition-all animate-pulse"
               >
                  <Download size={14} />
                  <span>התקן</span>
               </button>
            )}

            <button 
                onClick={requestNotificationPermission}
                className={`p-2 rounded-full transition-colors ${notificationPermission === 'granted' ? 'text-blue-500 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}
                title={notificationPermission === 'granted' ? 'התראות מופעלות' : 'הפעל התראות'}
            >
                {notificationPermission === 'granted' ? <BellRing size={18} /> : <Bell size={18} />}
            </button>
            <div className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                {pendingCount} נותרו
            </div>
          </div>
        </div>

        {/* Filters Tab */}
        <div className="flex px-2 py-2 gap-2 overflow-x-auto scrollbar-hide bg-white/95 backdrop-blur-sm">
          <button 
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-slate-800 text-white shadow' : 'bg-slate-50 text-slate-500'}`}
          >
            הכל
          </button>
          <button 
            onClick={() => setFilter('pending')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'pending' ? 'bg-blue-600 text-white shadow' : 'bg-slate-50 text-slate-500'}`}
          >
            לביצוע
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'completed' ? 'bg-green-600 text-white shadow' : 'bg-slate-50 text-slate-500'}`}
          >
            הושלמו
          </button>
        </div>
      </header>

      {/* 2. Scrollable Task Area (Middle) */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 pb-32"
      >
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50 text-center px-6">
            <div className="mb-4 bg-slate-200 p-4 rounded-full">
              <CalendarCheck size={40} className="text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-500">
              {filter === 'completed' ? 'אין משימות שהושלמו' : 'אין משימות כרגע'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {filter === 'completed' ? 'סמן משימות כהושלמו כדי לראות אותן כאן' : 'הוסף משימה למטה כדי להתחיל'}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onToggleSubtask={toggleSubtask}
              onPriorityChange={changeTaskPriority}
              onUpdateStatus={updateTaskStatus}
              onUpdateNotes={updateTaskNotes}
              onAddSubtask={addManualSubtask}
              onUpdateDueDate={updateTaskDueDate}
            />
          ))
        )}
      </main>

      {/* 3. Bottom Input Bar (Fixed) */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 p-3 pb-safe-bottom safe-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
        {isAiLoading && (
            <div className="text-xs text-purple-600 font-medium mb-2 flex items-center gap-2 animate-pulse px-1">
              <Loader2 size={12} className="animate-spin" />
              <span>ה-AI מכין תוכנית עבודה...</span>
            </div>
        )}
        
        <div className="flex gap-2 items-end">
           {/* Priority Button */}
           <button
            onClick={cycleNewTaskPriority}
            className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all ${getPriorityColor(newTaskPriority)}`}
            disabled={isAiLoading}
          >
            <Flag size={18} className="fill-current" />
          </button>

           {/* Date Picker Button (Hidden input trigger) */}
           <div className="relative">
             <button
               className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all ${newTaskDueDate ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-400 border-slate-200 hover:text-blue-500'}`}
               disabled={isAiLoading}
             >
               <Calendar size={18} />
             </button>
             {/* Uses datetime-local for specific times */}
             <input 
                type="datetime-local"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                disabled={isAiLoading}
             />
           </div>

          {/* Input Field */}
          <div className="flex-1 bg-slate-100 rounded-2xl flex items-center px-3 min-h-[44px] border border-transparent focus-within:border-blue-300 focus-within:bg-white transition-colors">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAiLoading && handleAddTask()}
              placeholder="משימה חדשה..."
              className="w-full bg-transparent border-none outline-none text-sm py-2 placeholder:text-slate-400"
              disabled={isAiLoading}
            />
          </div>

          {/* Action Button */}
          {newTaskTitle.length > 3 ? (
             <button
                onClick={handleSmartAdd}
                disabled={isAiLoading}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
             >
                {isAiLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
             </button>
          ) : (
            <button
                onClick={() => handleAddTask()}
                disabled={!newTaskTitle.trim() || isAiLoading}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${!newTaskTitle.trim() ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-md active:scale-95'}`}
            >
                <Plus size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
