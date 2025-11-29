
import React, { useState } from 'react';
import { Task, Priority, TaskStatus } from '../types';
import { Check, ChevronDown, ChevronUp, Trash2, Clock, Zap, Flag, Edit3, Plus, Play, CheckCircle2, Calendar } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onPriorityChange: (taskId: string, newPriority: Priority) => void;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onAddSubtask: (id: string, title: string) => void;
  onUpdateDueDate: (id: string, date: number | undefined) => void;
}

const PriorityBadge: React.FC<{ priority: Priority; onClick: () => void }> = ({ priority, onClick }) => {
  let colorClass = '';
  const currentPriority = priority || Priority.MEDIUM;
  
  switch (currentPriority) {
    case Priority.HIGH:
      colorClass = 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
      break;
    case Priority.MEDIUM:
      colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200';
      break;
    case Priority.LOW:
      colorClass = 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
      break;
    default:
      colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${colorClass} font-medium transition-colors`}
      title="לחץ לשינוי דחיפות"
    >
      <Flag size={10} className="fill-current" />
      <span>{currentPriority}</span>
    </button>
  );
};

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onToggle, 
  onDelete, 
  onToggleSubtask, 
  onPriorityChange,
  onUpdateStatus,
  onUpdateNotes,
  onAddSubtask,
  onUpdateDueDate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const calculateProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) {
        return task.status === 'completed' ? 100 : (task.status === 'in_progress' ? 50 : 0);
    }
    const completed = task.subtasks.filter(st => st.isCompleted).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const cyclePriority = () => {
    const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH];
    const currentP = task.priority || Priority.MEDIUM;
    const currentIndex = priorities.indexOf(currentP);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];
    onPriorityChange(task.id, nextPriority);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      onAddSubtask(task.id, newSubtaskTitle);
      setNewSubtaskTitle('');
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
        const date = new Date(e.target.value);
        onUpdateDueDate(task.id, date.getTime());
    } else {
        onUpdateDueDate(task.id, undefined);
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('he-IL', { 
        day: 'numeric', 
        month: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
  };

  // Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const toInputFormat = (timestamp: number) => {
      const date = new Date(timestamp);
      // Adjust for timezone offset to show local time in input
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
      return localISOTime;
  };

  const isOverdue = task.dueDate ? task.dueDate < Date.now() && task.status !== 'completed' : false;
  const progress = calculateProgress();
  const status = task.status || (task.isCompleted ? 'completed' : 'pending');

  const getStatusBorder = () => {
    if (status === 'completed') return 'border-slate-200';
    if (status === 'in_progress') return 'border-amber-400 bg-amber-50/30';
    return 'border-slate-200';
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border mb-4 transition-all duration-300 hover:shadow-md ${getStatusBorder()} ${status === 'completed' ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Main Checkbox / Status Indicator */}
          <button
            onClick={() => onToggle(task.id)}
            className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              status === 'completed'
                ? 'bg-blue-600 border-blue-600' 
                : status === 'in_progress'
                  ? 'border-amber-400 text-amber-500'
                  : 'border-slate-300 hover:border-blue-400'
            }`}
          >
            {status === 'completed' && <Check size={14} className="text-white" />}
            {status === 'in_progress' && <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className={`font-semibold text-lg text-slate-800 ml-2 ${status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <PriorityBadge priority={task.priority} onClick={cyclePriority} />
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-slate-400 hover:text-blue-500 p-1"
                >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            {task.description && (
              <p className="text-slate-600 text-sm mt-1">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
               {task.dueDate && (
                 <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                   <Calendar size={12} />
                   <span>{formatDateTime(task.dueDate)}</span>
                 </div>
               )}
               {task.estimatedTime && (
                 <div className="flex items-center gap-1">
                   <Clock size={12} />
                   <span>{task.estimatedTime}</span>
                 </div>
               )}
               {status === 'in_progress' && (
                 <div className="flex items-center gap-1 font-medium text-amber-600">
                   <Play size={10} className="fill-current" />
                   <span>בתהליך</span>
                 </div>
               )}
               {task.subtasks && task.subtasks.length > 0 && (
                 <div className="flex items-center gap-1 font-medium text-blue-600">
                   <Zap size={12} />
                   <span>{progress}% הושלם</span>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {(isExpanded || (task.subtasks && task.subtasks.length > 0) || task.notes) && (
            <div className={`mt-4 pt-4 border-t border-slate-100 ${!isExpanded && 'hidden'}`}>
                
                {/* Date & Notes Section */}
                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 w-full">
                         <Calendar size={14} className="text-slate-500" />
                         <span className="text-xs font-semibold text-slate-500">תאריך ושעה לתזכורת:</span>
                         <input 
                            type="datetime-local"
                            value={task.dueDate ? toInputFormat(task.dueDate) : ''}
                            onChange={handleDateChange}
                            className="bg-transparent text-sm focus:outline-none text-slate-700 flex-1 ltr text-right"
                         />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                            <Edit3 size={10} />
                            הערות ופרטים נוספים
                        </label>
                        <textarea 
                            className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                            rows={2}
                            placeholder="הוסף הערות כאן..."
                            value={task.notes || ''}
                            onChange={(e) => onUpdateNotes(task.id, e.target.value)}
                        />
                    </div>
                </div>

                {/* Subtasks List */}
                {task.subtasks && task.subtasks.length > 0 && (
                    <div className="space-y-2 mb-4">
                        <h4 className="text-xs font-semibold text-slate-500 mb-2">שלבי ביצוע</h4>
                        {task.subtasks.map((st) => (
                        <div key={st.id} className="flex items-center gap-2 group">
                            <button
                            onClick={() => onToggleSubtask(task.id, st.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                st.isCompleted 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-slate-300 hover:border-blue-400'
                            }`}
                            >
                            {st.isCompleted && <Check size={10} className="text-white" />}
                            </button>
                            <span className={`text-sm ${st.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {st.title}
                            </span>
                        </div>
                        ))}
                    </div>
                )}

                {/* Add Manual Subtask */}
                <form onSubmit={handleAddSubtask} className="flex gap-2 items-center mb-4">
                    <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="הוסף שלב חדש..."
                        className="flex-1 text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
                    />
                    <button 
                        type="submit"
                        disabled={!newSubtaskTitle.trim()}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-blue-100 hover:text-blue-600 disabled:opacity-50 transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </form>

                {/* Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onUpdateStatus(task.id, 'completed')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                status === 'completed' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                        >
                            <CheckCircle2 size={14} />
                            סיום מלא
                        </button>

                        <button 
                            onClick={() => onUpdateStatus(task.id, 'in_progress')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                status === 'in_progress' 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                        >
                            <Play size={14} />
                            בוצע חלקית
                        </button>
                    </div>

                    <button 
                        onClick={() => onDelete(task.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                        title="מחק משימה"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        )}
      </div>
      
      {/* Progress Bar */}
      {status !== 'completed' && (
        <div className="h-1 w-full bg-slate-50 rounded-b-xl overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${status === 'in_progress' ? 'bg-amber-400' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
