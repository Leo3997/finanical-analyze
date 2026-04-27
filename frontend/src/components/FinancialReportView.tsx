import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, TrendingUp, BarChart3, 
  Users, Target, Filter, Plus, Trash2, 
  Edit2, Upload, Check, AlertCircle, Download, Eye, Clock,
  FileUp, MoreVertical
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 使用相对路径，通过 Vite 代理访问后端
const API_BASE = "";

interface FinancialReport {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: '宏观' | '行业' | '技术' | '情绪';
  author: string;
  publishDate: string;
  readTime: number;
  views: number;
  rating: number;
  tags: string[];
  riskLevel: '低' | '中' | '高';
  targetSymbols: string[];
  fileType?: string;
  filePath?: string;
}

interface ReportFilter {
  category: string[];
  riskLevel: string[];
  timeRange: string;
  symbols: string[];
}

export const FinancialReportView = () => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ReportFilter>({
    category: [],
    riskLevel: [],
    timeRange: 'all',
    symbols: []
  });
  
  // 自定义滚动条样式
  const scrollbarStyles = `
    .dialog-scroll::-webkit-scrollbar {
      width: 6px;
    }
    .dialog-scroll::-webkit-scrollbar-track {
      background: #0a0a0a;
      border-radius: 3px;
    }
    .dialog-scroll::-webkit-scrollbar-thumb {
      background: #262630;
      border-radius: 3px;
    }
    .dialog-scroll::-webkit-scrollbar-thumb:hover {
      background: #3a3a45;
    }
  `;
  
  // 增删改查功能状态
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewInfo, setPreviewInfo] = useState({ type: '', total: 0, preview: 0 });
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // 上传表单数据
  const [uploadData, setUploadData] = useState({
    title: '',
    summary: '',
    content: '',
    category: '行业',
    author: '',
    riskLevel: '中',
    targetSymbols: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载研报列表
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports`);
      const result = await res.json();
      if (result.status === "Success") {
        setReports(result.data);
      }
    } catch (error) {
      console.error('Fetch reports error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 上传研报
  const handleUpload = async () => {
    if (!uploadData.title) {
      alert('请输入研报标题');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('summary', uploadData.summary);
      formData.append('content', uploadData.content);
      formData.append('category', uploadData.category);
      formData.append('author', uploadData.author || '用户上传');
      formData.append('risk_level', uploadData.riskLevel);
      formData.append('target_symbols', uploadData.targetSymbols);
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (result.status === "Success") {
        await fetchReports();
        resetUploadForm();
        setShowUploadDialog(false);
      } else {
        alert(`上传失败：${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 删除研报
  const handleDelete = async () => {
    if (!reportToDelete) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportToDelete}`, {
        method: 'DELETE'
      });

      const result = await res.json();
      if (result.status === "Success") {
        await fetchReports();
        setShowDeleteDialog(false);
        setReportToDelete(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // 更新研报
  const handleUpdate = async () => {
    if (!selectedReport) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(uploadData)
      });

      const result = await res.json();
      if (result.status === "Success") {
        await fetchReports();
        resetUploadForm();
        setShowEditDialog(false);
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  // 重置上传表单
  const resetUploadForm = () => {
    setUploadData({
      title: '',
      summary: '',
      content: '',
      category: '行业',
      author: '',
      riskLevel: '中',
      targetSymbols: ''
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 打开编辑对话框
  const openEditDialog = (report: FinancialReport) => {
    setSelectedReport(report);
    setUploadData({
      title: report.title,
      summary: report.summary || '',
      content: report.content || '',
      category: report.category,
      author: report.author,
      riskLevel: report.riskLevel,
      targetSymbols: report.targetSymbols.join(', ')
    });
    setShowEditDialog(true);
  };

  // 打开预览对话框
  const openPreviewDialog = async (report: FinancialReport) => {
    if (!report.fileType || !report.filePath) return;
    
    setLoadingPreview(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${report.id}/preview`);
      const result = await res.json();
      
      if (result.status === "Success") {
        setPreviewContent(result.data.content);
        setPreviewInfo({
          type: result.data.type,
          total: result.data.total_pages || result.data.paragraph_count || 0,
          preview: result.data.preview_pages || result.data.preview_paragraphs || 0
        });
        setShowPreviewDialog(true);
      } else {
        alert(`预览失败：${result.message}`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('预览失败，请重试');
    } finally {
      setLoadingPreview(false);
    }
  };

  // 筛选研报
  const filteredReports = reports.filter(report => {
    if (filters.category.length > 0 && !filters.category.includes(report.category)) return false;
    if (filters.riskLevel.length > 0 && !filters.riskLevel.includes(report.riskLevel)) return false;
    if (filters.timeRange !== 'all') {
      const reportDate = new Date(report.publishDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filters.timeRange === 'week' && diffDays > 7) return false;
      if (filters.timeRange === 'month' && diffDays > 30) return false;
    }
    return true;
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const getCategoryColor = (category: string) => {
    const colors = {
      '宏观': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      '行业': 'bg-green-500/10 text-green-400 border-green-500/20',
      '技术': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      '情绪': 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/10 text-gray-400';
  };

  const getRiskColor = (risk: string) => {
    const colors = {
      '低': 'text-green-400',
      '中': 'text-yellow-400',
      '高': 'text-red-400'
    };
    return colors[risk as keyof typeof colors] || 'text-gray-400';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/)) {
        alert('仅支持 PDF 和 Word 文件');
        return;
      }
      setSelectedFile(file);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
        <p className="text-[#5a5a5a] font-data uppercase tracking-widest text-xs">加载专业研报数据...</p>
      </div>
    );
  }

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="min-h-screen bg-[#0a0a0a] text-[#e8e6e3]">
      {/* 头部导航 */}
      <div className="border-b border-[#1e1e28] bg-[#131316]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[var(--gold)] to-[var(--gold-dim)]" />
                <div>
                  <h1 className="text-2xl font-serif font-bold tracking-tight">财经研报中心</h1>
                  <p className="text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase mt-0.5">Professional Financial Analysis Reports</p>
                </div>
              </div>
              
              <div className="flex gap-1">
                {['宏观', '行业', '技术', '情绪'].map(category => (
                  <button
                    key={category}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      category: prev.category.includes(category) 
                        ? prev.category.filter(c => c !== category)
                        : [...prev.category, category]
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filters.category.includes(category)
                        ? getCategoryColor(category)
                        : 'text-[#5a5a5a] hover:text-[#b0aca5] bg-transparent'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-[#262630] text-[#5a5a5a] hover:text-[var(--gold)] hover:border-[var(--gold)]/30"
              >
                <Filter className="w-4 h-4 mr-2" />
                筛选
              </Button>
              
              <Button
                onClick={() => {
                  resetUploadForm();
                  setShowUploadDialog(true);
                }}
                className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-bright)] text-[#09090b] font-semibold shadow-lg shadow-[var(--gold)]/10 border border-[var(--gold)]/30 text-xs h-9"
              >
                <Plus className="w-4 h-4 mr-2" />
                上传研报
              </Button>
              
              <Badge variant="outline" className="border-[#262630] text-[#7a7a85] font-data text-[10px] uppercase">
                {filteredReports.length} 篇研报
              </Badge>
            </div>
          </div>
          
          {/* 筛选面板 */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-lg bg-[#0d0d0f] border border-[#262630]">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-[#5a5a5a] uppercase tracking-wider block mb-2">时间范围</label>
                  <select 
                    value={filters.timeRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#262630] text-[#b0aca5] text-sm rounded-md px-3 py-2"
                  >
                    <option value="all">全部时间</option>
                    <option value="week">最近一周</option>
                    <option value="month">最近一月</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-[#5a5a5a] uppercase tracking-wider block mb-2">风险等级</label>
                  <div className="flex gap-2">
                    {['低', '中', '高'].map(risk => (
                      <button
                        key={risk}
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          riskLevel: prev.riskLevel.includes(risk)
                            ? prev.riskLevel.filter(r => r !== risk)
                            : [...prev.riskLevel, risk]
                        }))}
                        className={`px-3 py-1 rounded text-xs ${
                          filters.riskLevel.includes(risk)
                            ? getRiskColor(risk) + ' bg-white/5'
                            : 'text-[#5a5a5a] hover:text-[#b0aca5]'
                        }`}
                      >
                        {risk}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {selectedReport && !showEditDialog ? (
          /* 研报详情页 */
          <div className="grid grid-cols-12 gap-8">
            {/* 主要内容 */}
            <div className="col-span-8 space-y-6">
              <Card className="terminal-panel rounded-xl border-[#262630]">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getCategoryColor(selectedReport.category)}>
                          {selectedReport.category}
                        </Badge>
                        <span className={`text-sm ${getRiskColor(selectedReport.riskLevel)}`}>
                          风险等级：{selectedReport.riskLevel}
                        </span>
                      </div>
                      <CardTitle className="text-2xl font-serif leading-tight">
                        {selectedReport.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-[#5a5a5a]">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {selectedReport.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {selectedReport.publishDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {selectedReport.readTime}分钟阅读
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {selectedReport.views}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="border-[#262630] text-[#5a5a5a] hover:text-[var(--gold)]">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#131316] border-[#262630]">
                          <DropdownMenuItem onClick={() => openEditDialog(selectedReport)} className="text-[#b0aca5] hover:text-[var(--gold)]">
                            <Edit2 className="w-4 h-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setReportToDelete(selectedReport.id);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {selectedReport.fileType && selectedReport.filePath && (
                    <div className="mb-6 p-4 rounded-lg bg-[#0d0d0f] border border-[#262630] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileUp className="w-8 h-8 text-[var(--gold)]" />
                        <div>
                          <p className="text-sm font-medium text-[#e8e6e3]">附件文件</p>
                          <p className="text-xs text-[#5a5a5a] uppercase">{selectedReport.fileType}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openPreviewDialog(selectedReport)}
                          className="px-4 py-2 rounded-md bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30 text-xs font-medium hover:bg-[var(--gold)]/30 transition-all"
                        >
                          <Eye className="w-4 h-4 inline mr-2" />
                          预览
                        </button>
                        <a 
                          href={`${API_BASE}/${selectedReport.filePath}`}
                          className="px-4 py-2 rounded-md bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 text-xs font-medium hover:bg-[var(--gold)]/20 transition-all"
                          download
                        >
                          <Download className="w-4 h-4 inline mr-2" />
                          下载
                        </a>
                      </div>
                    </div>
                  )}
                  
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedReport.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 侧边栏 */}
            <div className="col-span-4 space-y-6">
              <Card className="terminal-panel rounded-xl border-[#262630]">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    相关品种
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.targetSymbols.map(symbol => (
                      <Badge key={symbol} variant="outline" className="border-[#262630] text-[#b0aca5]">
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* 研报列表页 */
          <div className="grid grid-cols-12 gap-6">
            {/* 研报列表 */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              {filteredReports.map(report => (
                <Card 
                  key={report.id} 
                  className="terminal-panel rounded-xl border-[#262630] hover:border-[var(--gold)]/30 transition-all cursor-pointer group"
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getCategoryColor(report.category)}>
                          {report.category}
                        </Badge>
                        <span className={`text-xs ${getRiskColor(report.riskLevel)}`}>
                          {report.riskLevel}风险
                        </span>
                        {report.fileType && (
                          <Badge variant="outline" className="border-[#262630] text-[#5a5a5a] text-[10px]">
                            <FileUp className="w-3 h-3 mr-1" />
                            {report.fileType.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {report.fileType && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openPreviewDialog(report);
                            }}
                            className="p-1.5 rounded hover:bg-white/5"
                            title="预览文件"
                          >
                            <Eye className="w-4 h-4 text-[#5a5a5a] hover:text-[var(--gold)]" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(report);
                          }}
                          className="p-1.5 rounded hover:bg-white/5"
                        >
                          <Edit2 className="w-4 h-4 text-[#5a5a5a] hover:text-[var(--gold)]" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportToDelete(report.id);
                            setShowDeleteDialog(true);
                          }}
                          className="p-1.5 rounded hover:bg-white/5"
                        >
                          <Trash2 className="w-4 h-4 text-[#5a5a5a] hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--gold)] transition-colors line-clamp-2">
                      {report.title}
                    </h3>
                    
                    <p className="text-sm text-[#8a8a8a] mb-4 line-clamp-2">
                      {report.summary}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-[#5a5a5a]">
                      <div className="flex items-center gap-4">
                        <span>{report.author}</span>
                        <span>{report.publishDate}</span>
                        <span>{report.readTime}分钟阅读</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {report.views}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 侧边统计 */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <Card className="terminal-panel rounded-xl border-[#262630]">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    热门研报
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reports.slice(0, 5).map(report => (
                      <div 
                        key={report.id}
                        className="p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs ${getCategoryColor(report.category)}`}>
                            {report.category}
                          </Badge>
                          <span className="text-xs text-[#5a5a5a]">{report.views}阅读</span>
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{report.title}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="terminal-panel rounded-xl border-[#262630]">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    分类统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {['宏观', '行业', '技术', '情绪'].map(category => {
                      const count = reports.filter(r => r.category === category).length;
                      return (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-[#b0aca5]">{category}</span>
                          <span className="text-[var(--gold)]">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* 上传研报对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-[#131316] border-[#262630] max-w-2xl max-h-[90vh] overflow-y-auto dialog-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif text-[#e8e6e3]">上传研报</DialogTitle>
            <DialogDescription className="text-[#5a5a5a]">
              支持 PDF 和 Word 文档，最大 10MB
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 pr-2 custom-scrollbar">
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">研报标题 *</Label>
              <Input
                value={uploadData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入研报标题"
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[#b0aca5]">分类</Label>
                <select
                  value={uploadData.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#262630] text-[#e8e6e3] text-sm rounded-md px-3 py-2"
                >
                  <option value="宏观">宏观</option>
                  <option value="行业">行业</option>
                  <option value="技术">技术</option>
                  <option value="情绪">情绪</option>
                </select>
              </div>
              
              <div className="grid gap-2">
                <Label className="text-[#b0aca5]">风险等级</Label>
                <select
                  value={uploadData.riskLevel}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadData(prev => ({ ...prev, riskLevel: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#262630] text-[#e8e6e3] text-sm rounded-md px-3 py-2"
                >
                  <option value="低">低</option>
                  <option value="中">中</option>
                  <option value="高">高</option>
                </select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">摘要</Label>
              <Textarea
                value={uploadData.summary}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUploadData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="简要描述研报内容"
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3] min-h-[80px]"
              />
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">作者</Label>
              <Input
                value={uploadData.author}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadData(prev => ({ ...prev, author: e.target.value }))}
                placeholder="请输入作者或机构名称"
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3]"
              />
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">相关品种</Label>
              <Input
                value={uploadData.targetSymbols}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadData(prev => ({ ...prev, targetSymbols: e.target.value }))}
                placeholder="例如：豆粕，玉米，白糖"
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3]"
              />
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">上传文件</Label>
              <div className="border-2 border-dashed border-[#262630] rounded-lg p-8 text-center hover:border-[var(--gold)]/50 transition-all cursor-pointer bg-[#0a0a0a]/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Upload className="w-10 h-10 text-[var(--gold)] mx-auto mb-3 opacity-80" />
                  <p className="text-sm text-[#e8e6e3] font-medium mb-1">
                    {selectedFile ? (
                      <span className="text-[var(--gold)]">✓ {selectedFile.name}</span>
                    ) : (
                      '点击选择文件或拖拽到此处'
                    )}
                  </p>
                  <p className="text-xs text-[#5a5a5a]">支持 PDF、DOC、DOCX 格式，最大 10MB</p>
                </label>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">研报内容</Label>
              <Textarea
                value={uploadData.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUploadData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="输入研报正文内容（支持 Markdown 格式）"
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3] min-h-[200px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              className="border-[#262630] text-[#5a5a5a]"
            >
              取消
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-bright)] text-[#09090b] font-semibold"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin mr-2" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  上传研报
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑研报对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#131316] border-[#262630] max-w-2xl max-h-[90vh] overflow-y-auto dialog-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif text-[#e8e6e3]">编辑研报</DialogTitle>
            <DialogDescription className="text-[#5a5a5a]">
              修改研报信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 pr-2 custom-scrollbar">
            {/* 与上传表单相同的字段 */}
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">研报标题 *</Label>
              <Input
                value={uploadData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[#b0aca5]">分类</Label>
                <select
                  value={uploadData.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#262630] text-[#e8e6e3] text-sm rounded-md px-3 py-2"
                >
                  <option value="宏观">宏观</option>
                  <option value="行业">行业</option>
                  <option value="技术">技术</option>
                  <option value="情绪">情绪</option>
                </select>
              </div>
              
              <div className="grid gap-2">
                <Label className="text-[#b0aca5]">风险等级</Label>
                <select
                  value={uploadData.riskLevel}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadData(prev => ({ ...prev, riskLevel: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#262630] text-[#e8e6e3] text-sm rounded-md px-3 py-2"
                >
                  <option value="低">低</option>
                  <option value="中">中</option>
                  <option value="高">高</option>
                </select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">摘要</Label>
              <Textarea
                value={uploadData.summary}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUploadData(prev => ({ ...prev, summary: e.target.value }))}
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3] min-h-[80px]"
              />
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">作者</Label>
              <Input
                value={uploadData.author}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadData(prev => ({ ...prev, author: e.target.value }))}
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3]"
              />
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">相关品种</Label>
              <Input
                value={uploadData.targetSymbols}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadData(prev => ({ ...prev, targetSymbols: e.target.value }))}
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3]"
              />
            </div>
            
            <div className="grid gap-2">
              <Label className="text-[#b0aca5]">研报内容</Label>
              <Textarea
                value={uploadData.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUploadData(prev => ({ ...prev, content: e.target.value }))}
                className="bg-[#0a0a0a] border-[#262630] text-[#e8e6e3] min-h-[200px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-[#262630] text-[#5a5a5a]"
            >
              取消
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-bright)] text-[#09090b] font-semibold"
            >
              <Check className="w-4 h-4 mr-2" />
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#131316] border-[#262630] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif text-[#e8e6e3]">确认删除</DialogTitle>
            <DialogDescription className="text-[#5a5a5a]">
              此操作不可恢复
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">警告</p>
                <p className="text-xs text-red-300/70 mt-1">
                  删除后将无法恢复，包括所有关联文件
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-[#262630] text-[#5a5a5a]"
            >
              取消
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 文件预览对话框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-[#131316] border-[#262630] max-w-4xl max-h-[90vh] overflow-y-auto dialog-scroll">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif text-[#e8e6e3] flex items-center gap-2">
              <Eye className="w-5 h-5" />
              文件预览
            </DialogTitle>
            <DialogDescription className="text-[#5a5a5a]">
              {previewInfo.type === 'pdf' ? (
                <>
                  共 {previewInfo.total} 页，显示前 {previewInfo.preview} 页
                </>
              ) : (
                <>
                  共 {previewInfo.total} 段，显示前 {previewInfo.preview} 段
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loadingPreview ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)]"></div>
                <p className="text-[#5a5a5a] text-sm">加载预览中...</p>
              </div>
            ) : previewContent ? (
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-4 text-[#5a5a5a]">
                <FileUp className="w-16 h-16 opacity-20" />
                <p>无预览内容</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              onClick={() => setShowPreviewDialog(false)}
              className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-bright)] text-[#09090b] font-semibold"
            >
              关闭预览
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};