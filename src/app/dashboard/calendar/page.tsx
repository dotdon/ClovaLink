'use client';

import { useState, useEffect } from 'react';
import { Button, Badge, Modal, Form } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { 
  FaCalendar, FaPlus, FaChevronLeft, FaChevronRight, 
  FaClock, FaMapMarkerAlt, FaUsers, FaTasks, FaFlag,
  FaCheck, FaTimes, FaEdit, FaTrash, FaBell, FaAlignLeft
} from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission } from '@/lib/permissions';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string | null;
  color: string | null;
  type: string;
  priority: string;
  status: string;
  isPrivate: boolean;
  createdById: string;
  companyId: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  attendees: Array<{
    id: string;
    status: string;
    employee: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  reminders: Array<{
    id: string;
    minutesBefore: number;
    sent: boolean;
  }>;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    allDay: false,
    location: '',
    color: '#667eea',
    type: 'TASK',
    priority: 'MEDIUM',
    status: 'PENDING',
    isPrivate: true,
  });

  const canCreate = hasPermission(session, Permission.CREATE_EVENTS);
  const canManageCompanyEvents = hasPermission(session, Permission.MANAGE_COMPANY_EVENTS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchEvents();
    }
  }, [session, currentDate, view]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on current view
      const { start, end } = getDateRange();
      
      const response = await fetch(
        `/api/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (view === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyId: !formData.isPrivate ? session?.user?.companyId : null,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchEvents();
      } else {
        const error = await response.json();
        alert('Failed to create event: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/calendar?id=${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowEventModal(false);
        setSelectedEvent(null);
        fetchEvents();
      } else {
        alert('Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const handleUpdateEventStatus = async (eventId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: newStatus }),
      });

      if (response.ok) {
        fetchEvents();
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent({ ...selectedEvent, status: newStatus });
        }
      }
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      allDay: false,
      location: '',
      color: '#667eea',
      type: 'TASK',
      priority: 'MEDIUM',
      status: 'PENDING',
      isPrivate: true,
    });
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      return (
        (date >= new Date(eventStart.toDateString()) && date <= new Date(eventEnd.toDateString())) ||
        (eventStart.toDateString() === date.toDateString())
      );
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    switch (event.type) {
      case 'TASK': return '#667eea';
      case 'MEETING': return '#17a2b8';
      case 'DEADLINE': return '#dc3545';
      case 'APPOINTMENT': return '#28a745';
      default: return '#667eea';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#dc3545';
      case 'HIGH': return '#ff6b6b';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDateHeader = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const { start, end } = getDateRange();
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <DashboardLayout>
      <div className="calendar-container">
        {/* Header */}
        <div className="calendar-header">
          <div className="header-left">
            <div className="header-icon">
              <FaCalendar />
            </div>
            <div>
              <h1>Calendar & Tasks</h1>
              <p className="header-subtitle">Manage your schedule, tasks, and reminders</p>
            </div>
          </div>
          {canCreate && (
            <Button className="create-event-btn" onClick={() => setShowCreateModal(true)}>
              <FaPlus /> New Event
            </Button>
          )}
        </div>

        {/* Calendar Controls */}
        <div className="calendar-controls">
          <div className="view-switcher">
            <Button
              className={`view-btn ${view === 'month' ? 'active' : ''}`}
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              className={`view-btn ${view === 'week' ? 'active' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              className={`view-btn ${view === 'day' ? 'active' : ''}`}
              onClick={() => setView('day')}
            >
              Day
            </Button>
          </div>

          <div className="date-navigator">
            <Button className="nav-btn" onClick={handlePrevious}>
              <FaChevronLeft />
            </Button>
            <Button className="today-btn" onClick={handleToday}>
              Today
            </Button>
            <h2 className="current-date">{formatDateHeader()}</h2>
            <Button className="nav-btn" onClick={handleNext}>
              <FaChevronRight />
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        {view === 'month' && (
          <div className="calendar-month">
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {getMonthDays().map((date, index) => {
                const dayEvents = date ? getEventsForDate(date) : [];
                const isToday = isMounted && date && date.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={index}
                    className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => date && setShowCreateModal(true)}
                  >
                    {date && (
                      <>
                        <div className="day-number">{date.getDate()}</div>
                        <div className="day-events">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className="event-badge"
                              style={{ borderLeftColor: getEventColor(event) }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setShowEventModal(true);
                              }}
                            >
                              <span className="event-title">{event.title}</span>
                              {event.allDay && <span className="all-day-badge">All day</span>}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="more-events">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event Details Modal */}
        {showEventModal && selectedEvent && (
          <Modal show={showEventModal} onHide={() => setShowEventModal(false)} centered className="event-modal">
            <Modal.Header closeButton>
              <Modal.Title>
                <div className="d-flex align-items-center gap-2">
                  <div className="event-type-icon" style={{ background: getEventColor(selectedEvent) }}>
                    <FaTasks />
                  </div>
                  <span>{selectedEvent.title}</span>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="event-details">
                <div className="detail-row">
                  <div className="detail-label">
                    <FaClock /> Time
                  </div>
                  <div className="detail-value">
                    {new Date(selectedEvent.startDate).toLocaleString()} - {new Date(selectedEvent.endDate).toLocaleString()}
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className="detail-row">
                    <div className="detail-label">Description</div>
                    <div className="detail-value">{selectedEvent.description}</div>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FaMapMarkerAlt /> Location
                    </div>
                    <div className="detail-value">{selectedEvent.location}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-label">
                    <FaFlag /> Priority
                  </div>
                  <Badge bg={getPriorityColor(selectedEvent.priority)}>
                    {selectedEvent.priority}
                  </Badge>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Status</div>
                  <div className="status-buttons">
                    {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant={selectedEvent.status === status ? 'primary' : 'outline-secondary'}
                        onClick={() => handleUpdateEventStatus(selectedEvent.id, status)}
                      >
                        {status.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FaUsers /> Attendees ({selectedEvent.attendees.length})
                    </div>
                    <div className="attendees-list">
                      {selectedEvent.attendees.map(attendee => (
                        <div key={attendee.id} className="attendee-item">
                          <span>{attendee.employee.name}</span>
                          <Badge bg={attendee.status === 'ACCEPTED' ? 'success' : attendee.status === 'DECLINED' ? 'danger' : 'secondary'}>
                            {attendee.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.reminders && selectedEvent.reminders.length > 0 && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FaBell /> Reminders
                    </div>
                    <div className="reminders-list">
                      {selectedEvent.reminders.map(reminder => (
                        <Badge key={reminder.id} bg="info">
                          {reminder.minutesBefore} min before
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              {selectedEvent.createdById === session?.user?.id && (
                <Button variant="danger" onClick={() => handleDeleteEvent(selectedEvent.id)}>
                  <FaTrash /> Delete
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowEventModal(false)}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered className="create-event-modal">
            <Modal.Header closeButton>
              <Modal.Title>
                <FaPlus /> Create New Event
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleCreateEvent}>
                <Form.Group className="mb-3">
                  <Form.Label>Title *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Event title"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Event description"
                  />
                </Form.Group>

                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Start Date & Time *</Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>End Date & Time *</Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="All day event"
                    checked={formData.allDay}
                    onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Event location"
                  />
                </Form.Group>

                <div className="row">
                  <div className="col-md-4">
                    <Form.Group className="mb-3">
                      <Form.Label>Type</Form.Label>
                      <Form.Select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="TASK">Task</option>
                        <option value="MEETING">Meeting</option>
                        <option value="REMINDER">Reminder</option>
                        <option value="DEADLINE">Deadline</option>
                        <option value="APPOINTMENT">Appointment</option>
                        <option value="OTHER">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-md-4">
                    <Form.Group className="mb-3">
                      <Form.Label>Priority</Form.Label>
                      <Form.Select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-md-4">
                    <Form.Group className="mb-3">
                      <Form.Label>Color</Form.Label>
                      <Form.Control
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label={canManageCompanyEvents ? "Private (only you can see)" : "Private event"}
                    checked={formData.isPrivate}
                    onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                    disabled={!canManageCompanyEvents}
                  />
                  {canManageCompanyEvents && !formData.isPrivate && (
                    <Form.Text className="text-warning">
                      This event will be visible to everyone in your company
                    </Form.Text>
                  )}
                </Form.Group>

                <div className="d-flex gap-2 justify-content-end mt-4">
                  <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gradient-btn">
                    <FaPlus /> Create Event
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal>
        )}

        <style jsx>{`
          .calendar-container {
            padding: 1.5rem;
            max-width: 1800px;
            margin: 0 auto;
          }

          .calendar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding: 2rem 2.5rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 20px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.2);
          }

          .calendar-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
            background-size: 200% 100%;
            animation: shimmer 3s linear infinite;
          }

          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }


          .header-left {
            display: flex;
            align-items: center;
            gap: 1.25rem;
          }

          .header-icon {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 1.75rem;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }

          .header-left h1 {
            margin: 0;
            font-size: 2.25rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }

          .header-subtitle {
            margin: 0.25rem 0 0 0;
            color: rgba(255, 255, 255, 0.75);
            font-size: 1rem;
            font-weight: 400;
          }

          .create-event-btn {
            background: #667eea;
            border: none;
            padding: 0.875rem 2rem;
            border-radius: 10px;
            font-weight: 600;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.625rem;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }

          .create-event-btn:hover {
            background: #5568d3;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }

          .create-event-btn:active {
            transform: translateY(0);
          }

          .calendar-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding: 1.25rem 1.5rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            backdrop-filter: blur(10px);
          }

          .view-switcher {
            display: flex;
            gap: 0.5rem;
            background: rgba(0, 0, 0, 0.2);
            padding: 0.375rem;
            border-radius: 12px;
          }

          .view-btn {
            padding: 0.625rem 1.5rem;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.925rem;
            transition: all 0.3s ease;
            position: relative;
          }

          .view-btn:hover {
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.05);
          }

          .view-btn.active {
            background: #667eea;
            color: #ffffff;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }

          .date-navigator {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .nav-btn {
            width: 40px;
            height: 40px;
            padding: 0;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            font-size: 0.875rem;
          }

          .nav-btn:hover {
            background: #667eea;
            border-color: #667eea;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }

          .today-btn {
            padding: 0.625rem 1.25rem;
            background: rgba(102, 126, 234, 0.12);
            border: 1px solid rgba(102, 126, 234, 0.25);
            color: #667eea;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.925rem;
            transition: all 0.3s ease;
          }

          .today-btn:hover {
            background: #667eea;
            border-color: #667eea;
            color: #ffffff;
            transform: translateY(-1px);
          }

          .current-date {
            margin: 0;
            font-size: 1.35rem;
            font-weight: 700;
            color: #ffffff;
            min-width: 280px;
            text-align: center;
            letter-spacing: -0.3px;
          }

          .calendar-month {
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }

          .calendar-weekdays {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
            border-bottom: 2px solid rgba(102, 126, 234, 0.3);
          }

          .weekday {
            padding: 1rem 0.75rem;
            text-align: center;
            font-weight: 700;
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.9);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
            background: rgba(102, 126, 234, 0.1);
            padding: 2px;
          }

          .calendar-day {
            min-height: 130px;
            background: rgba(255, 255, 255, 0.03);
            padding: 0.75rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 8px;
            position: relative;
          }

          .calendar-day:hover {
            background: rgba(102, 126, 234, 0.12);
          }

          .calendar-day.empty {
            background: rgba(0, 0, 0, 0.3);
            cursor: default;
            opacity: 0.4;
          }

          .calendar-day.empty:hover {
            background: rgba(0, 0, 0, 0.3);
            transform: none;
          }

          .calendar-day.today {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%);
            border: 2px solid #667eea;
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.3), inset 0 0 20px rgba(102, 126, 234, 0.1);
          }

          .day-number {
            font-weight: 700;
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.85);
            margin-bottom: 0.65rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            transition: all 0.3s ease;
          }

          .calendar-day:hover .day-number {
            background: rgba(102, 126, 234, 0.2);
            color: #ffffff;
          }

          .calendar-day.today .day-number {
            background: #667eea;
            color: #ffffff;
            font-weight: 800;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }

          .day-events {
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
          }

          .event-badge {
            padding: 0.375rem 0.625rem;
            background: rgba(0, 0, 0, 0.4);
            border-left: 4px solid;
            border-radius: 6px;
            font-size: 0.8rem;
            color: #ffffff;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            backdrop-filter: blur(10px);
          }

          .event-badge:hover {
            background: rgba(0, 0, 0, 0.6);
            transform: translateX(4px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          .event-title {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            font-weight: 500;
          }

          .all-day-badge {
            font-size: 0.65rem;
            padding: 0.15rem 0.35rem;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 4px;
            font-weight: 600;
            margin-left: 0.25rem;
          }

          .more-events {
            padding: 0.375rem 0.625rem;
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            font-weight: 700;
            background: rgba(102, 126, 234, 0.15);
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .more-events:hover {
            background: rgba(102, 126, 234, 0.25);
            color: #ffffff;
          }

          /* Event Details Modal */
          .event-details {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }

          .detail-row {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .detail-label {
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .detail-value {
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.95rem;
          }

          .status-buttons {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }

          .attendees-list,
          .reminders-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .attendee-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0.75rem;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
          }

          /* Global Modal Styles */
          :global(.event-modal .modal-content),
          :global(.create-event-modal .modal-content) {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
            border: 2px solid rgba(102, 126, 234, 0.3);
            border-radius: 20px;
            color: #ffffff;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            opacity: 1 !important;
          }

          :global(.event-modal .modal-header),
          :global(.create-event-modal .modal-header) {
            background: #667eea;
            border-bottom: none;
            color: #ffffff;
            padding: 1.75rem 2rem;
            position: relative;
          }

          :global(.event-modal .modal-header::after),
          :global(.create-event-modal .modal-header::after) {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
          }

          :global(.event-modal .modal-title),
          :global(.create-event-modal .modal-title) {
            font-weight: 700;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          :global(.event-modal .modal-body),
          :global(.create-event-modal .modal-body) {
            padding: 2rem;
          }

          :global(.event-modal .modal-footer),
          :global(.create-event-modal .modal-footer) {
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding: 1.5rem 2rem;
          }

          :global(.event-modal .btn-close),
          :global(.create-event-modal .btn-close) {
            filter: brightness(0) invert(1);
            opacity: 0.8;
            transition: all 0.3s ease;
          }

          :global(.event-modal .btn-close:hover),
          :global(.create-event-modal .btn-close:hover) {
            opacity: 1;
            transform: rotate(90deg);
          }

          :global(.create-event-modal .form-label) {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            font-size: 0.925rem;
            margin-bottom: 0.625rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          :global(.create-event-modal .form-control),
          :global(.create-event-modal .form-select) {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
            border-radius: 10px;
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
            transition: all 0.3s ease;
          }

          :global(.create-event-modal .form-control:focus),
          :global(.create-event-modal .form-select:focus) {
            background: rgba(255, 255, 255, 0.08);
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
            color: #ffffff;
          }

          :global(.create-event-modal .form-control::placeholder) {
            color: rgba(255, 255, 255, 0.4);
          }

          :global(.create-event-modal .form-check-input) {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            width: 1.25rem;
            height: 1.25rem;
            cursor: pointer;
          }

          :global(.create-event-modal .form-check-input:checked) {
            background-color: #667eea;
            border-color: #667eea;
          }

          :global(.create-event-modal .form-check-label) {
            color: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            margin-left: 0.5rem;
          }

          :global(.create-event-modal .form-text) {
            font-size: 0.85rem;
            margin-top: 0.5rem;
          }

          .event-type-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 1.25rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          :global(.gradient-btn) {
            background: #667eea;
            border: none;
            color: #ffffff;
            font-weight: 600;
            padding: 0.75rem 2rem;
            border-radius: 10px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          :global(.gradient-btn:hover) {
            background: #5568d3;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }

          :global(.gradient-btn:active) {
            transform: translateY(0);
          }

          @media (max-width: 1024px) {
            .calendar-container {
              padding: 1rem;
            }

            .calendar-header {
              padding: 1.5rem;
            }

            .header-icon {
              width: 56px;
              height: 56px;
              font-size: 1.5rem;
            }

            .header-left h1 {
              font-size: 1.75rem;
            }

            .header-subtitle {
              font-size: 0.9rem;
            }

            .create-event-btn {
              padding: 0.75rem 1.5rem;
              font-size: 0.95rem;
            }

            .calendar-day {
              min-height: 100px;
            }

            .current-date {
              font-size: 1.15rem;
              min-width: 220px;
            }
          }

          @media (max-width: 767px) {
            .calendar-container {
              padding: 1rem;
            }

            .calendar-header {
              flex-direction: column;
              align-items: stretch;
              gap: 1.25rem;
              padding: 1.25rem 1.5rem;
            }

            .header-left {
              gap: 1rem;
            }

            .header-icon {
              width: 48px;
              height: 48px;
              font-size: 1.25rem;
              border-radius: 14px;
            }

            .header-left h1 {
              font-size: 1.5rem;
            }

            .header-subtitle {
              font-size: 0.85rem;
            }

            .create-event-btn {
              width: 100%;
              justify-content: center;
              padding: 0.875rem 1.5rem;
            }

            .calendar-controls {
              flex-direction: column;
              gap: 1.25rem;
              padding: 1rem;
            }

            .view-switcher {
              width: 100%;
            }

            .view-btn {
              flex: 1;
              padding: 0.75rem 1rem;
              font-size: 0.875rem;
            }

            .date-navigator {
              width: 100%;
              justify-content: space-between;
            }

            .current-date {
              font-size: 1rem;
              min-width: auto;
              flex: 1;
            }

            .weekday {
              padding: 0.75rem 0.5rem;
              font-size: 0.75rem;
            }

            .calendar-day {
              min-height: 85px;
              padding: 0.5rem;
            }

            .day-number {
              font-size: 0.875rem;
              width: 24px;
              height: 24px;
              margin-bottom: 0.5rem;
            }

            .event-badge {
              padding: 0.3rem 0.5rem;
              font-size: 0.7rem;
              border-left-width: 3px;
            }

            .event-title {
              font-size: 0.7rem;
            }

            .all-day-badge {
              font-size: 0.6rem;
              padding: 0.1rem 0.25rem;
            }

            .more-events {
              padding: 0.3rem 0.5rem;
              font-size: 0.7rem;
            }

            :global(.event-modal .modal-body),
            :global(.create-event-modal .modal-body) {
              padding: 1.5rem;
            }

            :global(.event-modal .modal-header),
            :global(.create-event-modal .modal-header) {
              padding: 1.25rem 1.5rem;
            }

            :global(.event-modal .modal-title),
            :global(.create-event-modal .modal-title) {
              font-size: 1.25rem;
            }

            .event-type-icon {
              width: 40px;
              height: 40px;
              font-size: 1.1rem;
            }

            :global(.gradient-btn) {
              padding: 0.75rem 1.5rem;
              font-size: 0.95rem;
              width: 100%;
              justify-content: center;
            }

            :global(.create-event-modal .form-control),
            :global(.create-event-modal .form-select) {
              padding: 0.65rem 0.875rem;
              font-size: 0.9rem;
            }
          }

          @media (max-width: 480px) {
            .calendar-header {
              padding: 1rem 1.25rem;
            }

            .header-left h1 {
              font-size: 1.35rem;
            }

            .header-subtitle {
              font-size: 0.8rem;
            }

            .nav-btn {
              width: 36px;
              height: 36px;
            }

            .today-btn {
              padding: 0.5rem 1rem;
              font-size: 0.85rem;
            }

            .calendar-day {
              min-height: 75px;
              padding: 0.4rem;
            }

            .day-number {
              font-size: 0.8rem;
              width: 22px;
              height: 22px;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

