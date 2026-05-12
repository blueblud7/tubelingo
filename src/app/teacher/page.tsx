'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClassMember {
  student: { id: string; email: string; native_lang: string; target_lang: string } | null
  joined_at: string
  stats: { completed: number; streak: number; avgScore: number } | null
}

interface ClassChannel {
  channel: { id: string; name: string; youtube_id: string }
}

interface Class {
  id: string
  name: string
  description?: string
  invite_code: string
  class_members: { count: number }[]
  class_channels: ClassChannel[]
}

export default function TeacherDashboardPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [isTeacher, setIsTeacher] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [students, setStudents] = useState<ClassMember[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [classError, setClassError] = useState('')
  // Student join state
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null)
  // Channel assignment state
  const [myChannels, setMyChannels] = useState<{ id: string; name: string }[]>([])

  const fetchClasses = async () => {
    const res = await fetch('/api/teacher/classes')
    if (res.status === 403) {
      setIsTeacher(false)
      setLoading(false)
      return
    }
    setIsTeacher(true)
    const data = await res.json()
    if (Array.isArray(data)) setClasses(data)
    setLoading(false)
  }

  useEffect(() => { fetchClasses() }, [])

  useEffect(() => {
    if (!selectedClass) return
    fetch(`/api/teacher/classes/${selectedClass}/students`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setStudents(data))
    fetch('/api/channels')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setMyChannels(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))))
  }, [selectedClass])

  const assignChannel = async (classId: string, channelId: string) => {
    await fetch(`/api/teacher/classes/${classId}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId }),
    })
    await fetchClasses()
  }

  const removeChannel = async (classId: string, channelId: string) => {
    await fetch(`/api/teacher/classes/${classId}/channels?channelId=${channelId}`, { method: 'DELETE' })
    await fetchClasses()
  }

  const deleteClass = async (classId: string) => {
    await fetch(`/api/teacher/classes?classId=${classId}`, { method: 'DELETE' })
    setClasses((prev) => prev.filter((c) => c.id !== classId))
  }

  const removeStudent = async (classId: string, studentId: string) => {
    await fetch(`/api/teacher/classes/${classId}/students?studentId=${studentId}`, { method: 'DELETE' })
    setStudents((prev) => prev.filter((m) => m.student?.id !== studentId))
  }

  const createClass = async () => {
    if (!newClassName.trim()) return
    setCreating(true)
    setClassError('')
    const res = await fetch('/api/teacher/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setClasses((prev) => [{ ...data, class_members: [], class_channels: [] }, ...prev])
      setNewClassName('')
    } else {
      setClassError(data.error ?? 'Failed to create class')
    }
    setCreating(false)
  }

  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return
    setJoining(true)
    setJoinResult(null)
    const res = await fetch('/api/teacher/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: joinCode.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setJoinResult({ success: true, message: `Joined "${data.className}"!` })
      setJoinCode('')
    } else {
      setJoinResult({ success: false, message: data.error ?? 'Invalid invite code' })
    }
    setJoining(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-40 text-gray-400">Loading...</div>
  }

  if (!isTeacher) {
    return (
      <div className="flex flex-col gap-6 p-5">
        <div className="pt-4">
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500">Join a class with an invite code</p>
        </div>

        {/* Student: join class */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Join a class</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinClass()}
              placeholder="Enter invite code"
              maxLength={8}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono uppercase tracking-widest focus:border-blue-400 focus:outline-none"
            />
            <button
              onClick={handleJoinClass}
              disabled={joining || !joinCode.trim()}
              className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {joining ? '...' : 'Join'}
            </button>
          </div>
          {joinResult && (
            <p className={`mt-2 text-sm ${joinResult.success ? 'text-green-600' : 'text-red-500'}`}>
              {joinResult.message}
            </p>
          )}
        </div>

        {/* Teacher upgrade prompt */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Are you a teacher?</h2>
          <p className="text-sm text-gray-500">Create classes, distribute channels, and track student progress with the Team plan.</p>
          <Link
            href="/subscribe"
            className="mt-3 block rounded-xl bg-purple-500 py-3 text-center text-sm font-semibold text-white"
          >
            Upgrade to Team →
          </Link>
        </div>
      </div>
    )
  }

  // Student detail view
  if (selectedClass) {
    const cls = classes.find((c) => c.id === selectedClass)
    return (
      <div className="flex flex-col gap-5 p-5">
        <div className="pt-4 flex items-center gap-3">
          <button onClick={() => { setSelectedClass(null); setStudents([]) }} className="text-blue-500">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">{cls?.name}</h1>
        </div>

        {/* Invite code */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Invite code</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-lg font-bold tracking-widest text-gray-800">
              {cls?.invite_code}
            </code>
            <button
              onClick={() => copyInvite(cls?.invite_code ?? '')}
              className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white"
            >
              {copied === cls?.invite_code ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">Share this code with students to join the class</p>
        </div>

        {/* Student list */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Students ({students.length})
          </h2>
          {students.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No students yet. Share the invite code!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {students.map((m) => (
                <div key={m.student?.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{m.student?.email}</p>
                      <p className="text-xs text-gray-400">
                        {m.student?.native_lang?.toUpperCase()} → {m.student?.target_lang?.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {m.stats?.streak ?? 0}🔥 · {m.stats?.completed ?? 0} done
                        </p>
                        {(m.stats?.avgScore ?? 0) > 0 && (
                          <p className="text-xs text-gray-400">avg {m.stats?.avgScore}%</p>
                        )}
                      </div>
                      <button
                        onClick={() => m.student && removeStudent(selectedClass!, m.student.id)}
                        className="text-xs text-gray-300 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned channels */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Assigned channels
          </h2>
          {cls?.class_channels && cls.class_channels.length > 0 ? (
            <div className="flex flex-col gap-2 mb-3">
              {cls.class_channels.map((cc) => (
                <div key={cc.channel.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-500">
                    {cc.channel.name.charAt(0)}
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-900">{cc.channel.name}</span>
                  <button
                    onClick={() => removeChannel(selectedClass!, cc.channel.id)}
                    className="text-xs text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-sm text-gray-400">No channels assigned yet.</p>
          )}
          {myChannels.filter((ch) => !cls?.class_channels?.some((cc) => cc.channel.id === ch.id)).length > 0 && (
            <div className="flex flex-col gap-2">
              {myChannels
                .filter((ch) => !cls?.class_channels?.some((cc) => cc.channel.id === ch.id))
                .map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => assignChannel(selectedClass!, ch.id)}
                    className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 p-3 text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400">
                      {ch.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm text-gray-500">{ch.name}</span>
                    <span className="text-xs text-blue-400">+ Assign</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Classes list
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-sm text-gray-500">{classes.length} class{classes.length !== 1 ? 'es' : ''}</p>
      </div>

      {/* Create class */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createClass()}
          placeholder="Class name (e.g. Business English A)"
          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
        />
        <button
          onClick={createClass}
          disabled={creating || !newClassName.trim()}
          className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          {creating ? '...' : 'Create'}
        </button>
      </div>

      {classError && <p className="text-sm text-red-500">{classError}</p>}

      {classes.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          Create your first class to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {classes.map((cls) => {
            const memberCount = cls.class_members?.[0]?.count ?? 0
            return (
              <div
                key={cls.id}
                className="flex flex-col rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedClass(cls.id)} className="flex-1 text-left">
                    <h2 className="font-semibold text-gray-900">{cls.name}</h2>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{memberCount} student{memberCount !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => deleteClass(cls.id)}
                      className="text-xs text-gray-300 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {cls.description && (
                  <p className="mt-1 text-xs text-gray-500">{cls.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                    {cls.invite_code}
                  </code>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyInvite(cls.invite_code) }}
                    className="text-xs text-blue-400"
                  >
                    {copied === cls.invite_code ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
