import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQFormData {
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

const AdminFAQsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);

  const [formData, setFormData] = useState<FAQFormData>({
    question: "",
    answer: "",
    display_order: 1,
    is_active: true
  });

  // Fetch all FAQs (admin endpoint returns both active and inactive)
  const { data: faqs, isLoading, error } = useQuery<FAQ[]>({
    queryKey: ["/api/admin-faqs"],
    queryFn: () => apiRequest<FAQ[]>("/api/admin-faqs")
  });

  // Create FAQ mutation
  const createFAQ = useMutation({
    mutationFn: (data: FAQFormData) =>
      apiRequest("/api/admin-faqs", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] }); // Invalidate public endpoint too
      toast({
        title: "Success",
        description: "FAQ created successfully"
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create FAQ",
        variant: "destructive"
      });
    }
  });

  // Update FAQ mutation
  const updateFAQ = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FAQFormData }) =>
      apiRequest(`/api/admin-faqs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({
        title: "Success",
        description: "FAQ updated successfully"
      });
      setIsEditDialogOpen(false);
      setSelectedFAQ(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update FAQ",
        variant: "destructive"
      });
    }
  });

  // Delete FAQ mutation
  const deleteFAQ = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin-faqs/${id}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({
        title: "Success",
        description: "FAQ deleted successfully"
      });
      setIsDeleteDialogOpen(false);
      setSelectedFAQ(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete FAQ",
        variant: "destructive"
      });
    }
  });

  // Reorder FAQ mutation
  const reorderFAQ = useMutation({
    mutationFn: ({ id, newOrder }: { id: number; newOrder: number }) => {
      const faq = faqs?.find(f => f.id === id);
      if (!faq) throw new Error("FAQ not found");

      return apiRequest(`/api/admin-faqs/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          question: faq.question,
          answer: faq.answer,
          display_order: newOrder,
          is_active: faq.is_active
        }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reorder FAQ",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      question: "",
      answer: "",
      display_order: 1,
      is_active: true
    });
  };

  const handleAddClick = () => {
    resetForm();
    // Set display order to next available number
    if (faqs && faqs.length > 0) {
      const maxOrder = Math.max(...faqs.map(f => f.display_order));
      setFormData(prev => ({ ...prev, display_order: maxOrder + 1 }));
    }
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      display_order: faq.display_order,
      is_active: faq.is_active
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createFAQ.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFAQ) {
      updateFAQ.mutate({ id: selectedFAQ.id, data: formData });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedFAQ) {
      deleteFAQ.mutate(selectedFAQ.id);
    }
  };

  const handleMoveUp = (faq: FAQ) => {
    const sortedFAQs = [...(faqs || [])].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sortedFAQs.findIndex(f => f.id === faq.id);

    if (currentIndex > 0) {
      const previousFAQ = sortedFAQs[currentIndex - 1];
      // Swap display orders
      reorderFAQ.mutate({ id: faq.id, newOrder: previousFAQ.display_order });
      reorderFAQ.mutate({ id: previousFAQ.id, newOrder: faq.display_order });
    }
  };

  const handleMoveDown = (faq: FAQ) => {
    const sortedFAQs = [...(faqs || [])].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sortedFAQs.findIndex(f => f.id === faq.id);

    if (currentIndex < sortedFAQs.length - 1) {
      const nextFAQ = sortedFAQs[currentIndex + 1];
      // Swap display orders
      reorderFAQ.mutate({ id: faq.id, newOrder: nextFAQ.display_order });
      reorderFAQ.mutate({ id: nextFAQ.id, newOrder: faq.display_order });
    }
  };

  const sortedFAQs = faqs ? [...faqs].sort((a, b) => a.display_order - b.display_order) : [];

  return (
    <>
      <Helmet>
        <title>Admin - FAQ Management | Favilla's NY Pizza</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-8 h-8 text-[#d73a31]" />
              FAQ Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage frequently asked questions displayed on the homepage
            </p>
          </div>

          {/* Add FAQ Button */}
          <div className="mb-6">
            <Button onClick={handleAddClick} className="bg-[#d73a31] hover:bg-[#c73128]">
              <Plus className="w-4 h-4 mr-2" />
              Add New FAQ
            </Button>
          </div>

          {/* FAQs List */}
          <Card>
            <CardHeader>
              <CardTitle>All FAQs</CardTitle>
              <CardDescription>
                {faqs ? `${faqs.length} total FAQs` : "Loading..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#d73a31]" />
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center py-12 text-red-600">
                  <AlertCircle className="w-6 h-6 mr-2" />
                  <span>Error loading FAQs</span>
                </div>
              )}

              {!isLoading && !error && sortedFAQs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No FAQs yet. Click "Add New FAQ" to create one.</p>
                </div>
              )}

              {!isLoading && !error && sortedFAQs.length > 0 && (
                <div className="space-y-4">
                  {sortedFAQs.map((faq, index) => (
                    <div
                      key={faq.id}
                      className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* FAQ Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Order: {faq.display_order}
                            </Badge>
                            <Badge
                              variant={faq.is_active ? "default" : "secondary"}
                              className={faq.is_active ? "bg-green-500" : ""}
                            >
                              {faq.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-lg text-gray-900 mb-2">
                            {faq.question}
                          </h3>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Reorder Buttons */}
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveUp(faq)}
                              disabled={index === 0}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveDown(faq)}
                              disabled={index === sortedFAQs.length - 1}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Edit Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(faq)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Delete Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(faq)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add FAQ Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New FAQ</DialogTitle>
            <DialogDescription>
              Create a new frequently asked question
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-question">Question *</Label>
                <Input
                  id="add-question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="What is your question?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-answer">Answer *</Label>
                <Textarea
                  id="add-answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide a detailed answer..."
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-display-order">Display Order</Label>
                <Input
                  id="add-display-order"
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="add-is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="add-is-active">Active (visible on website)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={createFAQ.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#d73a31] hover:bg-[#c73128]"
                disabled={createFAQ.isPending}
              >
                {createFAQ.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create FAQ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit FAQ Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>
              Update the frequently asked question
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-question">Question *</Label>
                <Input
                  id="edit-question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="What is your question?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-answer">Answer *</Label>
                <Textarea
                  id="edit-answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide a detailed answer..."
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-display-order">Display Order</Label>
                <Input
                  id="edit-display-order"
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit-is-active">Active (visible on website)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateFAQ.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#d73a31] hover:bg-[#c73128]"
                disabled={updateFAQ.isPending}
              >
                {updateFAQ.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update FAQ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedFAQ && (
            <div className="py-4">
              <p className="font-semibold text-gray-900">{selectedFAQ.question}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteFAQ.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="destructive"
              disabled={deleteFAQ.isPending}
            >
              {deleteFAQ.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminFAQsPage;
